try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

from app.config import settings

class EmbeddingService:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None and HAS_SENTENCE_TRANSFORMERS:
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._model

    async def get_embedding(self, text: str) -> list[float]:
        if not HAS_SENTENCE_TRANSFORMERS or not self.model:
            # Fallback 384-dim mock embedding for testing without sentence-transformers installed
            return [0.0] * 384

        clean_text = text.replace("\n", " ")
        embedding = self.model.encode(clean_text)
        return embedding.tolist()

embedding_service = EmbeddingService()
