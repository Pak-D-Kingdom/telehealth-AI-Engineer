import os
import json
import faiss
import numpy as np
import yaml
import ollama
from pathlib import Path
from sentence_transformers import SentenceTransformer
from src.config import get_settings

_rag_service_instance = None

def get_rag_service():
    """Get singleton instance of RAGService."""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance

class RAGService:
    def __init__(self):
        self.settings = get_settings()
        self.index_dir = self.settings.faiss_index_dir
        self.index_path = os.path.join(self.index_dir, "faiss.index")
        self.metadata_path = os.path.join(self.index_dir, "metadata.json")
        
        self.documents = []
        self.index = None
        self.embedder = None
        
        self._init_embedding_model()
        self._load_or_build_index()

    def _init_embedding_model(self):
        if self.settings.embedding_provider == "local":
            print(f"Memuat model embedding lokal: {self.settings.embedding_model}...")
            self.embedder = SentenceTransformer(self.settings.embedding_model, trust_remote_code=True)
        else:
            print(f"Menggunakan Ollama API untuk embedding: {self.settings.ollama_embed_model}")

    def _get_embeddings(self, texts: list[str]) -> np.ndarray:
        if self.settings.embedding_provider == "local":
            return self.embedder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        else:
            response = ollama.embed(model=self.settings.ollama_embed_model, input=texts)
            return np.array(response['embeddings'], dtype=np.float32)

    def _chunk_text(self, text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            if len(current_chunk) + len(p) < chunk_size:
                current_chunk += "\n\n" + p
            else:
                if current_chunk: chunks.append(current_chunk.strip())
                current_chunk = p
        if current_chunk: chunks.append(current_chunk.strip())
            
        return chunks if chunks else [text]

    def _load_markdown_documents(self) -> list[dict]:
        documents = []
        base_dir = self.settings.knowledge_base_dir
        for path in Path(base_dir).rglob("*.md"):
            content = path.read_text(encoding="utf-8")
            metadata = {}
            body = content

            if content.startswith("---"):
                _, frontmatter, body = content.split("---", 2)
                metadata = yaml.safe_load(frontmatter) or {}

            documents.append({"path": str(path), "metadata": metadata, "content": body.strip()})
        return documents

    def _load_or_build_index(self):
        os.makedirs(self.index_dir, exist_ok=True)
        
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            print("Memuat FAISS index yang sudah ada...")
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.documents = json.load(f)
        else:
            print("Membangun FAISS index dari Knowledge Base...")
            self._build_index()

    def _build_index(self):
        raw_docs = self._load_markdown_documents()
        all_chunks = []
        all_metadatas = []
        
        for doc in raw_docs:
            chunks = self._chunk_text(doc['content'])
            for chunk in chunks:
                all_chunks.append(chunk)
                all_metadatas.append({
                    "path": doc['path'],
                    "metadata": doc['metadata'],
                    "chunk_text": chunk
                })
                
        if not all_chunks:
            print("Peringatan: Tidak ada dokumen ditemukan di knowledge base!")
            return

        print(f"Melakukan embedding pada {len(all_chunks)} chunks...")
        embeddings = self._get_embeddings(all_chunks)
        
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(embeddings)
        self.documents = all_metadatas
        
        faiss.write_index(self.index, self.index_path)
        with open(self.metadata_path, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f, ensure_ascii=False, indent=2)
        print("FAISS index berhasil dibangun dan disimpan.")

    def search(self, query: str, top_k: int = 3) -> str:
        if not self.index or self.index.ntotal == 0:
            return "Tidak ada konteks yang tersedia."
            
        query_embedding = self._get_embeddings([query])
        distances, indices = self.index.search(query_embedding, top_k)
        
        context_texts = []
        for idx in indices[0]:
            if idx != -1:
                doc = self.documents[idx]
                context_texts.append(f"[Sumber: {doc['path']}]\n{doc['chunk_text']}")
                
        return "\n\n---\n\n".join(context_texts)