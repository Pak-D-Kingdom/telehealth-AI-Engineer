import os
from app.services.vector_store import vector_store_service
from app.core.embeddings import embedding_service

class IngestService:
    async def ingest_local_storage(self) -> dict:
        """Reads all .md files from app/knowledge_base/ and uploads embeddings to local pgvector database or Supabase."""
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")
        if not os.path.exists(storage_dir):
            return {"status": "error", "message": "App knowledge base directory does not exist."}

        # Try direct PostgreSQL pgvector connection first (~80MB RAM)
        pg_conn = vector_store_service._get_pg_connection()
        if pg_conn:
            try:
                ingested_count = 0
                with pg_conn.cursor() as cur:
                    for file_name in os.listdir(storage_dir):
                        if file_name.endswith(".md"):
                            file_path = os.path.join(storage_dir, file_name)
                            with open(file_path, "r", encoding="utf-8") as f:
                                content = f.read()

                            embedding = await embedding_service.get_embedding(content)
                            embedding_str = f"[{','.join(map(str, embedding))}]"

                            cur.execute("""
                                INSERT INTO documents (name, content, embedding)
                                VALUES (%s, %s, %s::vector)
                                ON CONFLICT (name) DO UPDATE
                                SET content = EXCLUDED.content,
                                    embedding = EXCLUDED.embedding,
                                    created_at = NOW();
                            """, (file_name, content, embedding_str))
                            ingested_count += 1
                    pg_conn.commit()
                pg_conn.close()
                return {
                    "status": "success",
                    "ingested_files": ingested_count,
                    "target": "Local PostgreSQL pgvector",
                    "message": f"Successfully ingested {ingested_count} markdown documents from app/knowledge_base/ to local pgvector database."
                }
            except Exception as e:
                if pg_conn:
                    pg_conn.rollback()
                    pg_conn.close()

        # Try Supabase Client if configured
        if vector_store_service.client:
            try:
                ingested_count = 0
                for file_name in os.listdir(storage_dir):
                    if file_name.endswith(".md"):
                        file_path = os.path.join(storage_dir, file_name)
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()

                        embedding = await embedding_service.get_embedding(content)
                        vector_store_service.client.table("documents").upsert({
                            "name": file_name,
                            "content": content,
                            "embedding": embedding
                        }).execute()
                        ingested_count += 1

                return {
                    "status": "success",
                    "ingested_files": ingested_count,
                    "target": "Supabase API",
                    "message": f"Successfully ingested {ingested_count} markdown documents from app/knowledge_base/ to Supabase."
                }
            except Exception as e:
                return {"status": "error", "message": f"Supabase ingestion failed: {str(e)}"}

        return {
            "status": "warning",
            "message": "Neither PostgreSQL pgvector nor Supabase is connected. Local markdown files in app/knowledge_base/ will be used directly as fallback."
        }

ingest_service = IngestService()
