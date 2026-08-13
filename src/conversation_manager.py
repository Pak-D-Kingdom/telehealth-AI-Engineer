from typing import List, Dict, Optional
from datetime import datetime, timedelta
from src.config import get_settings

class ConversationManager:
    """
    Mengelola history percakapan per session.
    """
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.settings = get_settings()
        self.max_history = self.settings.max_conversation_history
        self.history: List[Dict[str, str]] = []
        self.entities: Dict = {
            "diabetes_status": None,
            "diabetes_type": None,
            "symptoms": [],
            "blood_sugar_info": None,
            "wound_info": None,
            "medications": [],
            "has_doctor": None,
            "is_pregnant": None
        }
        self.created_at = datetime.utcnow()
    
    def add_message(self, role: str, content: str):
        """Tambahkan pesan ke history."""
        self.history.append({"role": role, "content": content})
        # Batasi history
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_history(self) -> List[Dict[str, str]]:
        """Ambil history percakapan."""
        return self.history
    
    def update_entities(self, new_entities: Dict):
        """Update entities dari LLM response."""
        for key, value in new_entities.items():
            if key in self.entities:
                if key == "symptoms" and isinstance(value, list):
                    # Merge symptoms tanpa duplikat
                    existing = set(self.entities.get("symptoms", []))
                    existing.update(value)
                    self.entities["symptoms"] = list(existing)
                elif key == "medications" and isinstance(value, list):
                    existing = set(self.entities.get("medications", []))
                    existing.update(value)
                    self.entities["medications"] = list(existing)
                elif value is not None:
                    self.entities[key] = value
    
    def get_entities(self) -> Dict:
        """Ambil semua entities yang terkumpul."""
        return self.entities
    
    def is_session_expired(self) -> bool:
        """Cek apakah session sudah expired."""
        expiry = timedelta(hours=self.settings.session_expiry_hours)
        return datetime.utcnow() - self.created_at > expiry
    
    def get_summary(self) -> str:
        """Ringkasan profil diabetes user."""
        parts = []
        if self.entities.get("diabetes_status"):
            parts.append(f"Status: {self.entities['diabetes_status']}")
        if self.entities.get("diabetes_type"):
            parts.append(f"Tipe: {self.entities['diabetes_type']}")
        if self.entities.get("symptoms"):
            parts.append(f"Gejala: {', '.join(self.entities['symptoms'])}")
        if self.entities.get("blood_sugar_info"):
            parts.append(f"GD: {self.entities['blood_sugar_info']}")
        return " | ".join(parts) if parts else "Belum ada data"