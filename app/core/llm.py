import logging
from typing import Optional, List, Dict
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger("telehealth_ai.llm")

class GroqLLMService:
    def __init__(self):
        # Primary: Groq API
        self.groq_client = (
            AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
            if settings.GROQ_API_KEY
            else None
        )
        # Fallback 1: OpenRouter API
        self.openrouter_client = (
            AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
            if settings.OPENROUTER_API_KEY
            else None
        )
        # Fallback 2: Direct OpenAI API
        self.openai_client = (
            AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            if settings.OPENAI_API_KEY
            else None
        )

    async def generate_response(
        self,
        system_prompt: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> str:
        if not self.groq_client and not self.openrouter_client and not self.openai_client:
            return (
                "Sistem AI saat ini dalam mode demo (GROQ_API_KEY / OPENROUTER_API_KEY belum dikonfigurasi). "
                "Silakan masukkan API KEY pada file .env untuk mengaktifkan AI secara penuh."
            )

        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            for msg in chat_history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        messages.append({"role": "user", "content": user_message})

        last_error = None

        # Step 1: Try Groq models
        if self.groq_client:
            for model_name in settings.GROQ_MODELS:
                try:
                    logger.info(f"Mencoba komputasi LLM menggunakan model Groq: {model_name}")
                    response = await self.groq_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=temperature
                    )
                    content = response.choices[0].message.content
                    if content:
                        return content.strip()
                except Exception as e:
                    logger.warning(f"Model Groq '{model_name}' error/rate limit: {e}. Mengalihkan ke model berikutnya...")
                    last_error = e

        # Step 2: Try OpenRouter models as secondary fallback
        if self.openrouter_client:
            for model_name in settings.OPENROUTER_MODELS:
                try:
                    logger.info(f"Fallback ke OpenRouter model: {model_name}")
                    response = await self.openrouter_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=temperature
                    )
                    content = response.choices[0].message.content
                    if content:
                        return content.strip()
                except Exception as e:
                    logger.warning(f"Model OpenRouter '{model_name}' error: {e}. Mengalihkan...")
                    last_error = e

        # Step 3: Try Direct OpenAI client
        if self.openai_client:
            try:
                logger.info("Fallback ke direct OpenAI gpt-4o-mini")
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=temperature
                )
                content = response.choices[0].message.content
                if content:
                    return content.strip()
            except Exception as e:
                last_error = e

        return f"Maaf, seluruh Provider AI sedang tidak dapat diakses saat ini. Detail error: {str(last_error)}"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> str:
        """Alias for generate_response to support legacy/agent invocations."""
        return await self.generate_response(
            system_prompt=system_prompt,
            user_message=user_prompt,
            chat_history=chat_history,
            temperature=temperature
        )

llm_service = GroqLLMService()

