try:
    from fastembed import TextEmbedding
    HAS_FASTEMBED = True
except ImportError:
    HAS_FASTEMBED = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

from app.config import settings

class EmbeddingService:
    def __init__(self):
        self._fast_model = None
        self._st_model = None

    @property
    def model(self):
        if HAS_FASTEMBED:
            if self._fast_model is None:
                self._fast_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
            return ("fastembed", self._fast_model)
        elif HAS_SENTENCE_TRANSFORMERS:
            if self._st_model is None:
                self._st_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            return ("sentence-transformers", self._st_model)
        return (None, None)

    async def get_embedding(self, text: str) -> list[float]:
        model_type, model_inst = self.model
        clean_text = text.replace("\n", " ")

        if model_type == "fastembed":
            embeddings = list(model_inst.embed([clean_text]))
            return embeddings[0].tolist()
        elif model_type == "sentence-transformers":
            embedding = model_inst.encode(clean_text)
            return embedding.tolist()
        
        # Fallback 384-dim mock embedding if no embedding library is installed
        return [0.0] * 384

embedding_service = EmbeddingService()
