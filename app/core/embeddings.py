from openai import AsyncOpenAI
from app.config import settings

class EmbeddingService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def get_embedding(self, text: str) -> list[float]:
        if not self.client:
            # Fallback mock embedding (1536 dim zeros) for testing without API Key
            return [0.0] * 1536

        clean_text = text.replace("\n", " ")
        response = await self.client.embeddings.create(
            input=[clean_text],
            model=settings.EMBEDDING_MODEL
        )
        return response.data[0].embedding

embedding_service = EmbeddingService()
