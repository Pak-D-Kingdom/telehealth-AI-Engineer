from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import customer_router, finance_router, ads_router
from app.services.ingest_service import ingest_service

app = FastAPI(
    title="Telehealth AI Microservice (Diabetes Care)",
    description="Microservice AI pendampingan Diabetes Care berbasis RAG Supabase pgvector dan Multi-Agent.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(customer_router.router)
app.include_router(finance_router.router)
app.include_router(ads_router.router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "telehealth-ai",
        "version": "1.0.0",
        "domain": "diabetes-care",
        "environment": settings.NODE_ENV,
        "llm_model": settings.LLM_MODEL
    }

@app.post("/api/v1/ingest", tags=["Admin / Ingest"])
async def ingest_documents():
    """Trigger manual untuk ingest file .md di folder knowledge_base/ ke Supabase pgvector."""
    result = await ingest_service.ingest_local_storage()
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
