from fastapi import APIRouter
from app.agents.ads_agent import ads_agent

router = APIRouter(prefix="/api/v1/ads", tags=["Ads Agent (Phase 2)"])

@router.post("/analyze")
async def analyze_ads():
    return await ads_agent.analyze_ads_performance({})
