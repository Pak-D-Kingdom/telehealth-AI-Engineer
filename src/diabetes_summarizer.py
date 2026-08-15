class DiabetesSummarizer:
    def summarize(self, entities: dict) -> str:
        summary_parts = []
        
        if entities.get("diabetes_status") == "diagnosed":
            summary_parts.append(f"Status: Terdiagnosis {entities.get('diabetes_type', 'Diabetes')}")
        elif entities.get("diabetes_status") == "suspected":
            summary_parts.append("Status: Mencurigai diabetes (belum terdiagnosis)")
        else:
            summary_parts.append("Status: Belum diketahui")
        
        if entities.get("symptoms"):
            summary_parts.append(f"Gejala: {', '.join(entities['symptoms'])}")
        
        if entities.get("blood_sugar_info"):
            summary_parts.append(f"Gula Darah: {entities['blood_sugar_info']}")
        
        if entities.get("medications"):
            summary_parts.append(f"Obat: {', '.join(entities['medications'])}")
        
        if entities.get("wound_info"):
            summary_parts.append(f"Luka: {entities['wound_info']}")
        
        if entities.get("has_doctor") is False:
            summary_parts.append("Belum memiliki dokter")
        elif entities.get("has_doctor") is True:
            summary_parts.append("Sudah dalam perawatan dokter")
        
        return " | ".join(summary_parts) if summary_parts else "Belum ada data cukup."