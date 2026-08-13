import logging
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger("telehealth_ai.llm")

class GroqLLMService:
    def __init__(self):
        # Groq API is OpenAI-compatible using base_url https://api.groq.com/openai/v1
        if settings.GROQ_API_KEY:
            self.client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
        elif settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None

    async def generate_response(self, system_prompt: str, user_message: str, chat_history: list[dict] = None) -> str:
        if not self.client:
            return (
                "Sistem AI saat ini dalam mode demo (GROQ_API_KEY belum dikonfigurasi). "
                "Silakan masukkan GROQ_API_KEY pada file .env untuk mengaktifkan AI secara penuh."
            )

        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            for msg in chat_history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        messages.append({"role": "user", "content": user_message})

        # Round-Robin / Fallback Model Strategy (Jika 1 model rate limited, otomatis pindah ke model berikutnya)
        models_to_try = settings.GROQ_MODELS if settings.GROQ_API_KEY else [settings.OPENAI_API_KEY and "gpt-4o-mini" or "llama-3.3-70b-versatile"]

        last_error = None
        for model_name in models_to_try:
            try:
                logger.info(f"Mencoba komputasi LLM menggunakan model Groq: {model_name}")
                response = await self.client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.3
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"Model {model_name} mencapai rate limit atau error: {str(e)}. Mengalihkan otomatis ke model fallback berikutnya...")
                last_error = e
                continue

        return f"Maaf, seluruh model AI Groq sedang mencapai batas limit (Rate Limit). Silakan coba beberapa saat lagi. Detail error: {str(last_error)}"

llm_service = GroqLLMService()
