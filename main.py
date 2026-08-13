import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from src.rag_service import RAGService
from src.llm_service import LLMService

from src.agent.intake_parser import IntakeParser
from src.agent.triage_engine import TriageEngine

from src.agent.clinical_summarizer import ClinicalSummarizer

from src.agent.prescription_drafter import PrescriptionDrafter

app = FastAPI(
    title="Diabetes AI Health Assistant API",
    description="API untuk chatbot edukasi dan konsultasi diabetes.",
    version="1.0.0"
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

class ChatResponse(BaseModel):
    intent: str
    response_text: str
    red_flags: List[str]
    extracted_entities: Dict[str, Any]
    actions: List[str]

print("Memuat model AI dan FAISS Index...")
rag_service = RAGService()
llm_service = LLMService()
print("Server siap menerima request!")

session_data: Dict[str, Dict] = {}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Diabetes AI Health Engine is running."}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        if request.session_id not in session_data:
            session_data[request.session_id] = {
                "history": [],
                "entities": {}
            }
        
        data = session_data[request.session_id]
        context = rag_service.search(request.message, top_k=3)
        
        llm_response = llm_service.generate(
            user_message=request.message,
            context=context,
            history=data["history"],
            entities=data["entities"]
        )
        
        # --- SANITASI RESPONSE (Mencegah FastAPI Validation Error) ---
        # Jika LLM lupa mengirim field wajib, kita isi dengan default value
        if not isinstance(llm_response.get("red_flags"), list):
            llm_response["red_flags"] = []
        if not isinstance(llm_response.get("actions"), list):
            llm_response["actions"] = []
        if not isinstance(llm_response.get("extracted_entities"), dict):
            llm_response["extracted_entities"] = {}
        if not llm_response.get("intent"):
            llm_response["intent"] = "chitchat"
        if not llm_response.get("response_text"):
            llm_response["response_text"] = "Maaf, saya mengalami kendala dalam merespons."
        # -------------------------------------------------------------

        # Update history
        data["history"].append({"role": "user", "content": request.message})
        data["history"].append({"role": "assistant", "content": llm_response.get("response_text", "")})
        data["history"] = data["history"][-10:]
        
        # Update entities (merge tanpa duplikat)
        new_entities = llm_response.get("extracted_entities", {})
        for key, value in new_entities.items():
            if value is not None and value != [] and value != {}:
                if key in ["symptoms", "medications"] and isinstance(value, list):
                    existing = set(data["entities"].get(key, []))
                    existing.update(value)
                    data["entities"][key] = list(existing)
                else:
                    data["entities"][key] = value
        
        return llm_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pada server: {str(e)}")

intake_parser = IntakeParser()
triage_engine = TriageEngine()

@app.post("/api/intake/triage")
async def intake_triage(request: Dict[str, Any]):
    """
    Endpoint untuk memproses intake form pasien diabetes.
    Menerima JSON intake, menjalankan triage, dan mengembalikan hasil.
    """
    try:
        result = triage_engine.process(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")

clinical_agent = ClinicalSummarizer()

@app.post("/api/agent/summarize")
async def agent_summarize(request: Dict[str, Any]):
    """
    AI Agent endpoint: menerima intake form, memanggil tools, 
    dan menghasilkan ringkasan SOAP untuk dokter.
    
    Ini adalah AI Agent sesungguhnya:
    1. Reasoning: LLM menganalisa kasus
    2. Tool Use: Memanggil TriageEngine + RAG
    3. Planning: Memutuskan query RAG yang tepat
    4. Output: Ringkasan terstruktur
    """
    try:
        result = clinical_agent.generate_summary(request)
        return result
    except ValueError as e:
        raise

prescription_agent = PrescriptionDrafter()

@app.post("/api/agent/prescribe")
async def agent_prescribe(request: Dict[str, Any]):
    """
    Fase 3: AI Prescription Drafter.
    AI Agent yang menyusun draf e-resep.
    """
    try:
        print("\n" + "="*60)
        print("ENDPOINT: /api/agent/prescribe called")
        print("="*60)
        
        result = prescription_agent.generate_prescription(request)
        
        print(f"Result type: {type(result)}")
        print(f"Result keys: {result.keys() if isinstance(result, dict) else 'N/A'}")
        
        return result
        
    except Exception as e:
        import traceback
        error_detail = f"Prescription agent error: {str(e)}\n{traceback.format_exc()}"
        print(f"\n[ENDPOINT ERROR] {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)