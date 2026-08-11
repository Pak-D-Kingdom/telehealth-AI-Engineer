from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    whatsapp_admin_number: str = Field(default="", alias="WHATSAPP_ADMIN_NUMBER")
    embedding_model: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL")
    fallback_embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        alias="FALLBACK_EMBEDDING_MODEL",
    )
    gemini_model: str = Field(default="gemini-2.5-flash-lite", alias="GEMINI_MODEL")
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

