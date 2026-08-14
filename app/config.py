from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    PORT: int = 8000
    NODE_ENV: str = "development"
    X_AI_API_KEY: str = "telehealth_ai_secret_key_dev"

    # Groq AI Settings & Model Fallback Strategy
    GROQ_API_KEY: str = ""
    GROQ_MODELS: List[str] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
    ]

    # Free Local Embedding Model for Vector Search (SentenceTransformers)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Local Lightweight pgvector Database & Supabase Settings (Port 5435 to avoid backend port 5434 conflict)
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5435/telehealth_db"
    SUPABASE_URL: str = "http://127.0.0.1:54321"
    SUPABASE_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
