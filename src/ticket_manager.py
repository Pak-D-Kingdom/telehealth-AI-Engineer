from src.config import get_settings

class TicketManager:
    """
    Membuat tiket dan link WhatsApp untuk handoff ke tim medis/admin.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.admin_number = self.settings.whatsapp_admin_number
    
    def create_ticket_summary(
        self,
        session_id: str,
        user_message: str,
        intent: str,
        entities: dict,
        red_flags: list
    ) -> dict:
        """
        Membuat ringkasan tiket untuk handoff.
        """
        # Tentukan prioritas berdasarkan red flags
        if red_flags:
            priority = "urgent"
            ticket_type = "emergency"
        elif intent == "wound_care":
            priority = "high"
            ticket_type = "wound_care"
        elif intent == "handoff_request":
            priority = "normal"
            ticket_type = "consultation"
        else:
            priority = "normal"
            ticket_type = "follow_up"
        
        # Buat ringkasan
        summary_parts = [
            f"Session: {session_id}",
            f"Intent: {intent}",
            f"Pesan User: {user_message[:200]}"
        ]
        
        if entities.get("diabetes_status"):
            summary_parts.append(f"Status Diabetes: {entities['diabetes_status']}")
        
        if entities.get("diabetes_type"):
            summary_parts.append(f"Tipe: {entities['diabetes_type']}")
        
        if entities.get("symptoms"):
            summary_parts.append(f"Gejala: {', '.join(entities['symptoms'])}")
        
        if entities.get("blood_sugar_info"):
            summary_parts.append(f"Gula Darah: {entities['blood_sugar_info']}")
        
        if entities.get("wound_info"):
            summary_parts.append(f"Luka: {entities['wound_info']}")
        
        if red_flags:
            summary_parts.append(f"RED FLAGS: {', '.join(red_flags)}")
        
        return {
            "session_id": session_id,
            "ticket_type": ticket_type,
            "priority": priority,
            "summary": " | ".join(summary_parts),
            "whatsapp_link": self._generate_whatsapp_link(summary_parts)
        }
    
    def _generate_whatsapp_link(self, summary_parts: list) -> str:
        """
        Membuat link WhatsApp dengan pesan otomatis ke admin.
        """
        if not self.admin_number:
            return ""
        
        message = "[DIABETES AI - HANDOFF]\n" + "\n".join(summary_parts)
        encoded_message = message.replace(" ", "%20").replace("\n", "%0A")
        return f"https://wa.me/{self.admin_number}?text={encoded_message}"