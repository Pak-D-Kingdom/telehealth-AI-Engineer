from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from supabase import create_client, Client
from src.config import get_settings


class SupabaseService:
    def __init__(self):
        settings = get_settings()
        
        if not settings.supabase_url or not settings.supabase_secret_key:
            raise ValueError("SUPABASE_URL dan SUPABASE_SECRET_KEY wajib ada di .env")
        
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_secret_key
        )
        print(f"Supabase connected: {settings.supabase_url}")
    
    def get_or_create_patient(self, phone: str = None, email: str = None, name: str = None) -> Dict[str, Any]:
        if phone:
            result = self.client.table("patients").select("*").eq("phone", phone).execute()
            if result.data:
                return result.data[0]
        
        if email:
            result = self.client.table("patients").select("*").eq("email", email).execute()
            if result.data:
                return result.data[0]
        
        patient_data = {"phone": phone, "email": email, "name": name}
        result = self.client.table("patients").insert(patient_data).execute()
        return result.data[0]
    
    def update_patient(self, patient_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        result = self.client.table("patients").update(updates).eq("id", patient_id).execute()
        return result.data[0]
    
    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        result = self.client.table("patients").select("*").eq("id", patient_id).execute()
        return result.data[0] if result.data else None
    
    def create_chat_session(self, patient_id: str = None, session_key: str = None) -> Dict[str, Any]:
        session_data = {
            "patient_id": patient_id,
            "session_key": session_key,
            "status": "active"
        }
        result = self.client.table("chat_sessions").insert(session_data).execute()
        return result.data[0]
    
    def get_chat_session(self, session_id: str = None, session_key: str = None) -> Optional[Dict[str, Any]]:
        query = self.client.table("chat_sessions").select("*")
        
        if session_id:
            query = query.eq("id", session_id)
        elif session_key:
            query = query.eq("session_key", session_key)
        
        result = query.execute()
        return result.data[0] if result.data else None
    
    def update_session_entities(self, session_id: str, entities: Dict[str, Any]) -> None:
        self.client.table("chat_sessions").update({
            "entities": entities,
            "last_message_at": datetime.now().isoformat()
        }).eq("id", session_id).execute()
    
    def save_message(
        self, 
        session_id: str, 
        role: str, 
        content: str, 
        intent: str = None, 
        entities: Dict = None, 
        red_flags: List = None, 
        attachments: List = None
    ) -> Dict[str, Any]:
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "intent": intent,
            "entities": entities or {},
            "red_flags": red_flags or [],
            "attachments": attachments or []
        }
        result = self.client.table("chat_messages").insert(message_data).execute()
        return result.data[0]
    
    def get_session_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        result = self.client.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=False)\
            .limit(limit)\
            .execute()
        return result.data
    
    def get_session_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        messages = self.get_session_messages(session_id, limit)
        return [{"role": msg["role"], "content": msg["content"]} for msg in messages]
    
    def add_medical_record(
        self, 
        patient_id: str, 
        record_type: str, 
        title: str, 
        description: str = None, 
        doctor_name: str = None,
        hospital: str = None, 
        record_date: str = None
    ) -> Dict[str, Any]:
        record_data = {
            "patient_id": patient_id,
            "record_type": record_type,
            "title": title,
            "description": description,
            "doctor_name": doctor_name,
            "hospital": hospital,
            "record_date": record_date or datetime.now().date().isoformat()
        }
        result = self.client.table("medical_records").insert(record_data).execute()
        return result.data[0]
    
    def get_patient_medical_records(self, patient_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        result = self.client.table("medical_records")\
            .select("*")\
            .eq("patient_id", patient_id)\
            .order("record_date", desc=True)\
            .limit(limit)\
            .execute()
        return result.data
    
    def add_medication(
        self, 
        patient_id: str, 
        name: str, 
        dosage: str = None,
        frequency: str = None, 
        is_current: bool = True
    ) -> Dict[str, Any]:
        med_data = {
            "patient_id": patient_id,
            "name": name,
            "dosage": dosage,
            "frequency": frequency,
            "is_current": is_current,
            "start_date": datetime.now().date().isoformat()
        }
        result = self.client.table("medications").insert(med_data).execute()
        return result.data[0]
    
    def get_patient_medications(self, patient_id: str, current_only: bool = True) -> List[Dict[str, Any]]:
        query = self.client.table("medications").select("*").eq("patient_id", patient_id)
        if current_only:
            query = query.eq("is_current", True)
        result = query.order("created_at", desc=True).execute()
        return result.data
    
    def add_glucose_reading(
        self, 
        patient_id: str, 
        value: float, 
        reading_type: str,
        measured_at: str = None, 
        notes: str = None
    ) -> Dict[str, Any]:
        reading_data = {
            "patient_id": patient_id,
            "value": value,
            "reading_type": reading_type,
            "measured_at": measured_at or datetime.now().isoformat(),
            "notes": notes
        }
        result = self.client.table("glucose_readings").insert(reading_data).execute()
        return result.data[0]
    
    def get_patient_glucose_readings(self, patient_id: str, days: int = 30) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        result = self.client.table("glucose_readings")\
            .select("*")\
            .eq("patient_id", patient_id)\
            .gte("measured_at", start_date)\
            .order("measured_at", desc=True)\
            .execute()
        return result.data
    
    def save_food_analysis(
        self, 
        patient_id: str, 
        session_id: str = None,
        detected_items: List = None, 
        total_nutrition: Dict = None,
        balance_score: int = None, 
        glycemic_impact: str = None,
        advice: str = None,
        image_url: str = None
    ) -> Dict[str, Any]:
        analysis_data = {
            "patient_id": patient_id,
            "session_id": session_id,
            "image_url": image_url,
            "detected_items": detected_items or [],
            "total_nutrition": total_nutrition or {},
            "balance_score": balance_score,
            "glycemic_impact": glycemic_impact,
            "advice": advice
        }
        result = self.client.table("food_analyses").insert(analysis_data).execute()
        return result.data[0]
    
    def save_risk_assessment(
        self, 
        patient_id: str, 
        assessment_type: str,
        score: int, 
        category: str, 
        breakdown: Dict = None,
        recommendation: str = None
    ) -> Dict[str, Any]:
        assessment_data = {
            "patient_id": patient_id,
            "assessment_type": assessment_type,
            "score": score,
            "category": category,
            "breakdown": breakdown or {},
            "recommendation": recommendation
        }
        result = self.client.table("risk_assessments").insert(assessment_data).execute()
        return result.data[0]
    
    def log_drug_interaction(
        self, 
        patient_id: str, 
        medications: List[str],
        interactions: List[Dict], 
        severity: str = None
    ) -> Dict[str, Any]:
        log_data = {
            "patient_id": patient_id,
            "medications": medications,
            "interactions": interactions,
            "severity": severity
        }
        result = self.client.table("drug_interactions_log").insert(log_data).execute()
        return result.data[0]