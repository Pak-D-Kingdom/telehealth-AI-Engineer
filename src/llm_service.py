import json
import sqlite3
import time
from pathlib import Path
from datetime import datetime
from groq import Groq
from src.config import get_settings
from src.prompt_templates import SYSTEM_PROMPT


class LLMService:
    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan di file .env!")
        
        self.client = Groq(
            api_key=settings.groq_api_key,
            timeout=60.0,
            max_retries=3
        )
        self.model = "llama-3.3-70b-versatile"
        
        self.db_path = Path("data/ai_agent.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        print(f"AI Agent database initialized at: {self.db_path}")

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
            messages.extend(history[-6:])
        
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
3. Jika user menjawab "tidak", "iya", atau "biasa saja", akui jawabannya secara singkat, lalu LANJUTKAN ke topik yang BENAR-BENAR BARU (misal: riwayat keluarga, status cek gula darah, atau gaya hidup).
4. JANGAN terjebak hanya menanyakan gejala fisik (seperti lelah/lemas/kesemutan) terus-menerus. Jika sudah tanya 2 gejala, pindah ke riwayat keluarga atau cek lab.
5. Jika data gejala, riwayat keluarga, dan status cek gula darah sudah terkumpul, BERHENTI BERTANYA dan berikan kesimpulan/rekomendasi.
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
        
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.3,
                    max_tokens=1024,
                    timeout=60.0
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
                
                return result
                
            except json.JSONDecodeError:
                print(f"JSON Parse Error. Raw: {content[:300]}")
                return self._fallback_response()
            except Exception as e:
                error_msg = str(e)
                print(f"Attempt {attempt + 1}/{max_attempts} failed: {error_msg}")
                
                if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                    if attempt < max_attempts - 1:
                        wait_time = (attempt + 1) * 2
                        print(f"Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                
                if attempt == max_attempts - 1:
                    print(f"Error memanggil Groq setelah {max_attempts} attempts: {e}")
                    return self._fallback_response()
        
        return self._fallback_response()

    def _fallback_response(self) -> dict:
        return {
            "intent": "error",
            "response_text": "Maaf, saya sedang mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.",
            "red_flags": [],
            "extracted_entities": {},
            "actions": []
        }