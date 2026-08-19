from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenRouter (untuk text LLM)
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    llm_model: str = Field(default="nvidia/nemotron-3-ultra-550b-a55b:free", alias="LLM_MODEL")
    
    # Groq (KHUSUS untuk vision/food analyzer)
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    
    # Embedding Config
    embedding_provider: str = Field(default="local", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    ollama_embed_model: str = Field(default="qwen3-emb:0.6b", alias="OLLAMA_EMBED_MODEL")

    # Backend (Express rekan)
    backend_url: str = Field(default="http://localhost:4000", alias="BACKEND_URL")
    
    # Supabase Database
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_publishable_key: str = Field(default="", alias="SUPABASE_PUBLISHABLE_KEY")
    supabase_secret_key: str = Field(default="", alias="SUPABASE_SECRET_KEY")

    # App Config
    whatsapp_admin_number: str = Field(default="", alias="WHATSAPP_ADMIN_NUMBER")
    database_url: str = Field(default="sqlite:///data/skincarebot.db", alias="DATABASE_URL")
    faiss_index_dir: str = Field(default="faiss_index", alias="FAISS_INDEX_DIR")
    knowledge_base_dir: str = Field(default="knowledge_base", alias="KNOWLEDGE_BASE_DIR")
    max_conversation_history: int = Field(default=20, alias="MAX_CONVERSATION_HISTORY")
    session_expiry_hours: int = Field(default=24, alias="SESSION_EXPIRY_HOURS")
    app_env: str = Field(default="development", alias="APP_ENV")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True


@lru_cache
def get_settings() -> Settings:
    return Settings()