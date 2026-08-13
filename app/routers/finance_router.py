from fastapi import APIRouter
from app.agents.finance_agent import finance_agent

router = APIRouter(prefix="/api/v1/finance", tags=["Finance Agent (Phase 2)"])

@router.post("/analyze")
async def analyze_finance():
    return await finance_agent.analyze_financial_data({})
