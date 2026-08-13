import json
from groq import Groq
from src.config import get_settings
from src.prompt_templates import SYSTEM_PROMPT

class LLMService:
    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan di file .env!")
        
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama-3.1-8b-instant"

    def build_messages(self, user_message: str, context: str = "", history: list = None, entities: dict = None) -> list:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Masukkan history percakapan
        if history:
            messages.extend(history)
        
        # Format entities yang sudah terkumpul
        entities_str = json.dumps(entities, ensure_ascii=False, indent=2) if entities else "Belum ada data"
        
        # [PENTING] Cari pesan bot terakhir dari history
        last_bot_message = ""
        if history:
            for msg in reversed(history):
                if msg["role"] == "assistant":
                    last_bot_message = msg["content"]
                    break

        # GABUNGKAN SEMUA KONTEKS, ATURAN, DAN PESAN TERAKHIR BOT DI SINI
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

    def generate(self, user_message: str, context: str = "", history: list = None, entities: dict = None) -> dict:
        messages = self.build_messages(user_message, context, history, entities)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1024
            )
            
            content = response.choices[0].message.content
            
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            
            return json.loads(content)
            
        except json.JSONDecodeError:
            print(f"JSON Parse Error. Raw: {content[:300]}")
            return self._fallback_response()
        except Exception as e:
            print(f"Error memanggil Groq: {e}")
            return self._fallback_response()

    def _fallback_response(self) -> dict:
        return {
            "intent": "error",
            "response_text": "Maaf Kak, saya mengalami kendala teknis. Silakan coba lagi.",
            "red_flags": [],
            "extracted_entities": {},
            "actions": []
        }