import json
import sqlite3
import time
from pathlib import Path
from datetime import datetime
from openai import OpenAI
from src.config import get_settings
from src.prompt_templates import SYSTEM_PROMPT


class LLMService:
    def __init__(self):
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY tidak ditemukan di file .env!")
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=60.0,
            max_retries=3
        )
        
        self.model = settings.llm_model
        
        self.fallback_models = [
            "nvidia/nemotron-3-ultra-550b-a55b:free",
            "nvidia/llama-3.3-nemotron-super-49b-v1:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemma-3-27b-it:free"
        ]
        
        self.db_path = Path("data/ai_agent.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        print(f"AI Agent database initialized at: {self.db_path}")
        print(f"LLM Model (OpenRouter): {self.model}")

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    session_id TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    entities TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT,
                    content TEXT,
                    intent TEXT,
                    entities TEXT,
                    red_flags TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_session 
                ON chat_messages(session_id)
            """)
            conn.commit()

    def get_session_history(self, session_id: str) -> list:
        if not session_id:
            return []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at",
                (session_id,)
            )
            return [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]

    def get_session_entities(self, session_id: str) -> dict:
        if not session_id:
            return {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT entities FROM chat_sessions WHERE session_id = ?",
                (session_id,)
            )
            row = cursor.fetchone()
            if row and row[0]:
                try:
                    return json.loads(row[0])
                except json.JSONDecodeError:
                    return {}
            return {}

    def update_session_entities(self, session_id: str, entities: dict):
        if not session_id:
            return
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """UPDATE chat_sessions 
                   SET entities = ?, last_activity = ?
                   WHERE session_id = ?""",
                (json.dumps(entities or {}), datetime.now().isoformat(), session_id)
            )
            conn.commit()

    def _save_message(self, session_id: str, role: str, content: str, 
                      intent: str = None, entities: dict = None, red_flags: list = None):
        if not session_id:
            return
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO chat_sessions (session_id, last_activity, entities)
                   VALUES (?, ?, ?)
                   ON CONFLICT(session_id) DO UPDATE SET 
                       last_activity = excluded.last_activity,
                       entities = COALESCE(excluded.entities, chat_sessions.entities)""",
                (session_id, datetime.now().isoformat(), json.dumps(entities or {}))
            )
            
            conn.execute(
                """INSERT INTO chat_messages 
                   (session_id, role, content, intent, entities, red_flags)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    role,
                    content,
                    intent,
                    json.dumps(entities or {}),
                    json.dumps(red_flags or [])
                )
            )
            conn.commit()

    def build_messages(self, user_message: str, context: str = "", 
                       history: list = None, entities: dict = None,
                       session_id: str = None) -> list:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        if session_id and not history:
            history = self.get_session_history(session_id)
        
        if history:
            messages.extend(history[-10:])
        
        entities_str = json.dumps(entities, ensure_ascii=False, indent=2) if entities else "Belum ada data"
        
        last_bot_message = ""
        if history:
            for msg in reversed(history):
                if msg["role"] == "assistant":
                    last_bot_message = msg["content"]
                    break

        if len(context) > 2000:
            context = context[:2000] + "..."

        final_user_prompt = f"""Konteks Medis dari Knowledge Base:
{context}

DATA USER YANG SUDAH TERKUMPUL (JANGAN tanyakan hal ini lagi!):
{entities_str}

PESAN TERAKHIR YANG KAMU KIRIM KE USER:
"{last_bot_message}"

ATURAN KHUSUS UNTUK PESAN INI (WAJIB DITAATI):
1. User baru saja membalas PESAN TERAKHIR kamu di atas.
2. JANGAN PERNAH mengulang pertanyaan yang sudah ada di "PESAN TERAKHIR" atau "DATA USER".
3. Jika user menjawab "tidak", "iya", atau "biasa saja", akui jawabannya secara singkat, lalu LANJUTKAN ke topik yang BENAR-BENAR BARU.
4. JANGAN terjebak hanya menanyakan gejala fisik terus-menerus.
5. Jika data sudah terkumpul, BERHENTI BERTANYA dan berikan kesimpulan/rekomendasi.
6. WAJIB update `extracted_entities` berdasarkan jawaban user saat ini.

Pesan User Saat Ini:
{user_message}
"""
        messages.append({"role": "user", "content": final_user_prompt})
        return messages

    def generate(self, user_message: str, context: str = "", 
                 history: list = None, entities: dict = None,
                 session_id: str = None) -> dict:
        messages = self.build_messages(user_message, context, history, entities, session_id)
        
        models_to_try = [self.model] + [m for m in self.fallback_models if m != self.model]
        
        for model in models_to_try:
            try:
                print(f"[LLM] Trying model: {model}")
                
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.3,
                    max_tokens=1024,
                    extra_headers={
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "GlucoCare AI Agent"
                    }
                )
                
                content = response.choices[0].message.content
                
                if content.startswith("```json"):
                    content = content[7:-3].strip()
                elif content.startswith("```"):
                    content = content[3:-3].strip()
                
                result = json.loads(content)
                
                if session_id:
                    self._save_message(
                        session_id=session_id,
                        role="user",
                        content=user_message
                    )
                    
                    self._save_message(
                        session_id=session_id,
                        role="assistant",
                        content=result.get("response_text", ""),
                        intent=result.get("intent"),
                        entities=result.get("extracted_entities"),
                        red_flags=result.get("red_flags")
                    )
                
                print(f"[LLM] ✓ Success with model: {model}")
                return result
                
            except json.JSONDecodeError:
                print(f"[LLM] JSON Parse Error with model {model}")
                continue
            except Exception as e:
                error_msg = str(e)
                print(f"[LLM] ✗ Model {model} failed: {error_msg}")
                
                if "404" in error_msg or "not_found" in error_msg:
                    continue
                
                if "timeout" in error_msg.lower():
                    print(f"[LLM] Timeout, retrying in 3 seconds...")
                    time.sleep(3)
                    continue
                
                return self._fallback_response()
        
        return self._fallback_response()

    def _fallback_response(self) -> dict:
        return {
            "intent": "error",
            "response_text": "Maaf, saya sedang mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.",
            "red_flags": [],
            "extracted_entities": {},
            "actions": [],
            "suggested_questions": []
        }