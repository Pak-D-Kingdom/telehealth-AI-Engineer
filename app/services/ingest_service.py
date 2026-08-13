import os
from app.services.vector_store import vector_store_service
from app.core.embeddings import embedding_service

class IngestService:
    async def ingest_local_storage(self) -> dict:
        """Reads all .md files from app/knowledge_base/ and uploads embeddings to Supabase pgvector."""
        if not vector_store_service.client:
            return {
                "status": "warning",
                "message": "Supabase client not configured. Local markdown files in app/knowledge_base/ will be used directly as fallback."
            }

        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")
        ingested_count = 0

        if not os.path.exists(storage_dir):
            return {"status": "error", "message": "App knowledge base directory does not exist."}

        for file_name in os.listdir(storage_dir):
            if file_name.endswith(".md"):
                file_path = os.path.join(storage_dir, file_name)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Generate embedding for content
                embedding = await embedding_service.get_embedding(content)
                
                # Upsert into Supabase 'documents' table
                vector_store_service.client.table("documents").upsert({
                    "name": file_name,
                    "content": content,
                    "embedding": embedding
                }).execute()
                ingested_count += 1

        return {
            "status": "success",
            "ingested_files": ingested_count,
            "message": f"Successfully ingested {ingested_count} markdown documents from app/knowledge_base/ to Supabase pgvector."
        }

ingest_service = IngestService()
