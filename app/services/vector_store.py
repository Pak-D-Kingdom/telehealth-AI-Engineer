import os
from supabase import create_client, Client
from app.config import settings
from app.core.embeddings import embedding_service

class VectorStoreService:
    def __init__(self):
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        else:
            self.client = None

    async def search_similar_documents(self, query: str, limit: int = 3) -> list[str]:
        if not self.client:
            # Fallback local markdown reader from app/storage/ if Supabase is not configured yet
            return self._fallback_local_search(query)

        query_embedding = await embedding_service.get_embedding(query)
        try:
            # Match documents via Supabase RPC function (match_documents)
            response = self.client.rpc(
                "match_documents",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.5,
                    "match_count": limit
                }
            ).execute()
            
            if response.data:
                return [item["content"] for item in response.data]
            return []
        except Exception:
            return self._fallback_local_search(query)

    def _fallback_local_search(self, query: str) -> list[str]:
        """Reads local markdown files from app/knowledge_base/ as RAG fallback."""
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")
        contexts = []
        if os.path.exists(storage_dir):
            for file_name in os.listdir(storage_dir):
                if file_name.endswith(".md"):
                    file_path = os.path.join(storage_dir, file_name)
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        contexts.append(f"--- Document: {file_name} ---\n{content}")
        return contexts

vector_store_service = VectorStoreService()
