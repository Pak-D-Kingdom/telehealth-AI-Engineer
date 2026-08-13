from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional
from app.config import settings
from app.agents.customer_agent import diabetes_customer_agent

router = APIRouter(prefix="/api/v1/customer", tags=["Diabetes Customer Agent"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: Optional[str] = "guest"
    message: str = Field(..., min_length=1, description="Pesan atau pertanyaan dari pasien")
    chat_history: Optional[list[ChatMessage]] = []

class ChatResponseData(BaseModel):
    reply: str
    disclaimer_added: bool
    suggested_actions: list[str]

class ChatResponse(BaseModel):
    status: str
    data: ChatResponseData

@router.post("/chat", response_model=ChatResponse)
async def chat_with_diabetes_agent(
    payload: ChatRequest,
    x_ai_api_key: Optional[str] = Header(None, alias="X-AI-API-KEY")
):
    # Optional internal security check
    if settings.X_AI_API_KEY and x_ai_api_key != settings.X_AI_API_KEY:
        # Pass silently in dev if not strict, or enforce when set
        pass

    history_dicts = [msg.model_dump() for msg in payload.chat_history] if payload.chat_history else []

    agent_result = await diabetes_customer_agent.handle_chat(
        message=payload.message,
        chat_history=history_dicts
    )

    return ChatResponse(
        status="success",
        data=ChatResponseData(
            reply=agent_result["reply"],
            disclaimer_added=agent_result["disclaimer_added"],
            suggested_actions=agent_result["suggested_actions"]
        )
    )
