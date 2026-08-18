from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    PORT: int = 8000
    NODE_ENV: str = "development"
    X_AI_API_KEY: str = "telehealth_ai_secret_key_dev"

    # Groq AI Settings & Model Fallback Strategy
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Provider 1: Groq Cloud API Models (Active Models hosted directly on Groq LPU platform)
    GROQ_MODELS: List[str] = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
        "groq/compound-mini",
        "groq/compound",
        "allam-2-7b"
    ]

    # Provider 2: OpenRouter API Models (Fallback Models)
    OPENROUTER_MODELS: List[str] = [
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat",
        "qwen/qwen-2.5-72b-instruct",
        "mistralai/mistral-small-24b-instruct-2501",
        "openai/gpt-4o-mini"
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
