import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List

from src.rag_service import RAGService
from src.llm_service import LLMService
from src.agent.backend_client import BackendClient
from src.agent.chat_response_adapter import ChatResponseAdapter
from src.agent.intake_parser import IntakeParser
from src.agent.triage_engine import TriageEngine
from src.agent.clinical_summarizer import ClinicalSummarizer
from src.agent.prescription_drafter import PrescriptionDrafter
from src.agent.food_analyzer import FoodAnalyzer
from src.agent.health_tools import GlucoseAnalyzer, RiskCalculator, InteractionChecker


app = FastAPI(
    title="GlucoCare AI Agent",
    description="AI Agent untuk konsultasi diabetes dengan multi-endpoint",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str

class FoodAnalyzeRequest(BaseModel):
    image_base64: str
    user_note: str = ""

class FoodCompareRequest(BaseModel):
    images: List[str]
    user_note: str = ""

class GlucoseTrendsRequest(BaseModel):
    readings: List[Dict[str, Any]]

class FindriscRequest(BaseModel):
    age: int
    bmi: float
    waist_cm: float
    gender: str = "male"
    eat_vegetables_daily: bool = False
    physical_activity: bool = False
    hypertension_medication: bool = False
    high_blood_glucose_history: bool = False
    family_history: str = "none"

class InteractionRequest(BaseModel):
    medications: List[str]


print("Initializing AI Agent services...")

backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
backend_client = BackendClient(backend_url=backend_url, cache_ttl=300)

rag_service = RAGService()
llm_service = LLMService()
response_adapter = ChatResponseAdapter(backend_client=backend_client)

intake_parser = IntakeParser()
triage_engine = TriageEngine()
clinical_summarizer = ClinicalSummarizer()
prescription_drafter = PrescriptionDrafter()
food_analyzer = FoodAnalyzer()

glucose_analyzer = GlucoseAnalyzer()
risk_calculator = RiskCalculator()
interaction_checker = InteractionChecker()

print("AI Agent services ready!")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "GlucoCare AI Agent",
        "backend_url": backend_url,
        "endpoints": {
            "/health": "GET - Health check",
            "/api/chat": "POST - Chatbot",
            "/api/intake/triage": "POST - Triage engine",
            "/api/agent/summarize": "POST - Clinical summarizer",
            "/api/agent/prescribe": "POST - Prescription drafter",
            "/api/food/analyze": "POST - Food image analysis",
            "/api/food/compare": "POST - Multi-food comparison",
            "/api/glucose/trends": "POST - Glucose trend analysis",
            "/api/risk/findrisc": "POST - FINDRISC risk calculator",
            "/api/meds/interactions": "POST - Drug interaction check"
        }
    }


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        session_entities = llm_service.get_session_entities(request.session_id)

        context = rag_service.search(request.message, top_k=3)

        llm_response = llm_service.generate(
            user_message=request.message,
            context=context,
            session_id=request.session_id,
            entities=session_entities
        )

        if not isinstance(llm_response.get("red_flags"), list):
            llm_response["red_flags"] = []
        if not isinstance(llm_response.get("extracted_entities"), dict):
            llm_response["extracted_entities"] = {}
        if not isinstance(llm_response.get("suggested_questions"), list):
            llm_response["suggested_questions"] = []

        new_entities = llm_response.get("extracted_entities", {})
        for key, value in new_entities.items():
            if value is not None and value != [] and value != {}:
                session_entities[key] = value

        llm_service.update_session_entities(request.session_id, session_entities)

        adapted = response_adapter.adapt(llm_response, request.message)

        return adapted

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/api/intake/triage")
async def intake_triage(request: Dict[str, Any]):
    try:
        result = triage_engine.process(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Triage error: {str(e)}")


@app.post("/api/agent/summarize")
async def agent_summarize(request: Dict[str, Any]):
    try:
        result = clinical_summarizer.generate_summary(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarizer error: {str(e)}")


@app.post("/api/agent/prescribe")
async def agent_prescribe(request: Dict[str, Any]):
    try:
        result = prescription_drafter.generate_prescription(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prescription error: {str(e)}")


@app.post("/api/food/analyze")
async def food_analyze(request: FoodAnalyzeRequest):
    try:
        result = food_analyzer.analyze(
            image_base64=request.image_base64,
            user_note=request.user_note
        )
        result["disclaimer"] = (
            "Analisis ini adalah estimasi edukasi berdasarkan gambar, "
            "bukan pengukuran gizi presisi maupun diagnosis medis."
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Food analysis error: {str(e)}")


@app.post("/api/food/compare")
async def food_compare(request: FoodCompareRequest):
    try:
        result = food_analyzer.compare_images(
            images=request.images,
            user_note=request.user_note
        )
        result["disclaimer"] = (
            "Analisis ini adalah estimasi edukasi berdasarkan gambar, "
            "bukan pengukuran gizi presisi maupun diagnosis medis."
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Food comparison error: {str(e)}")


@app.post("/api/glucose/trends")
async def glucose_trends(request: GlucoseTrendsRequest):
    try:
        return glucose_analyzer.analyze(request.readings)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Trends error: {str(e)}")


@app.post("/api/risk/findrisc")
async def risk_findrisc(request: FindriscRequest):
    try:
        return risk_calculator.calculate_findrisc(request.dict())
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"FINDRISC error: {str(e)}")


@app.post("/api/meds/interactions")
async def meds_interactions(request: InteractionRequest):
    try:
        return interaction_checker.check(request.medications)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Interaction error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)