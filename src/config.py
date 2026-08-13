from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Groq LLM Config
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    
    # Embedding Config (Qwen3)
    embedding_provider: str = Field(default="local", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="Qwen/Qwen3-Embedding-0.6B", alias="EMBEDDING_MODEL")
    ollama_embed_model: str = Field(default="qwen3-emb:0.6b", alias="OLLAMA_EMBED_MODEL")

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