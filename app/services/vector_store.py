import os
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

from app.config import settings
from app.core.embeddings import embedding_service

class VectorStoreService:
    def __init__(self):
        if HAS_SUPABASE and settings.SUPABASE_URL and settings.SUPABASE_KEY:
            self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        else:
            self.client = None

    def _get_pg_connection(self):
        if not HAS_PSYCOPG2 or not settings.DATABASE_URL:
            return None
        try:
            return psycopg2.connect(settings.DATABASE_URL)
        except Exception:
            return None

    async def search_similar_documents(self, query: str, limit: int = 3) -> list[str]:
        # Priority 1: Direct lightweight PostgreSQL + pgvector connection (~80MB RAM)
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                query_embedding = await embedding_service.get_embedding(query)
                embedding_str = f"[{','.join(map(str, query_embedding))}]"
                with pg_conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT content
                        FROM documents
                        WHERE 1 - (embedding <=> %s::vector) > 0.3
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (embedding_str, embedding_str, limit))
                    rows = cur.fetchall()
                pg_conn.close()
                if rows:
                    return [r["content"] for r in rows]
                return []
            except Exception:
                if pg_conn:
                    pg_conn.close()

        # Priority 2: Supabase Client RPC call (if configured)
        if self.client:
            try:
                query_embedding = await embedding_service.get_embedding(query)
                response = self.client.rpc(
                    "match_documents",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": 0.3,
                        "match_count": limit
                    }
                ).execute()
                if response.data:
                    return [item["content"] for item in response.data]
            except Exception:
                pass

        # Priority 3: Fallback local markdown reader from app/knowledge_base/
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
