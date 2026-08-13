# src/triage_engine.py

class TriageEngine:
    """
    Menentukan tingkat urgensi dan jalur penanganan berdasarkan kondisi user.
    """
    
    URGENCY_LEVELS = {
        "emergency": "SEGERA ke IGD/Rumah Sakit",
        "urgent": "Segera konsultasi ke dokter (hari ini)",
        "moderate": "Konsultasi ke dokter dalam 1-3 hari",
        "routine": "Konsultasi rutin sesuai jadwal",
        "education": "Edukasi mandiri, konsultasi jika perlu"
    }
    
    def triage(self, entities: dict, red_flags: list) -> dict:
        """
        Menentukan urgensi dan tindakan berdasarkan data user.
        
        Returns:
            {
                "urgency_level": str,
                "recommended_action": str,
                "refer_to": str,
                "notes": str
            }
        """
        # Level 1: EMERGENCY
        if red_flags:
            return {
                "urgency_level": "emergency",
                "recommended_action": "SEGERA ke IGD atau Rumah Sakit terdekat",
                "refer_to": "IGD / Emergency Room",
                "notes": f"Tanda bahaya terdeteksi: {', '.join(red_flags)}. Jangan tunda pertolongan medis."
            }
        
        # Level 2: URGENT - Luka diabetes yang tidak sembuh
        wound_info = entities.get("wound_info", "")
        if wound_info and any(kw in wound_info.lower() for kw in ["tidak sembuh", "bernanah", "berbau", "hitam"]):
            return {
                "urgency_level": "urgent",
                "recommended_action": "Segera konsultasi ke dokter untuk penanganan luka",
                "refer_to": "Dokter / Klinik Perawatan Luka Diabetes",
                "notes": "Luka diabetes memerlukan penanganan khusus untuk mencegah infeksi dan komplikasi."
            }
        
        # Level 3: MODERATE - Gejala baru, belum terdiagnosis
        if entities.get("diabetes_status") == "suspected" and entities.get("symptoms"):
            return {
                "urgency_level": "moderate",
                "recommended_action": "Periksakan gula darah ke dokter atau laboratorium",
                "refer_to": "Dokter Umum / Puskesmas / Laboratorium",
                "notes": "Gejala yang dialami perlu evaluasi medis untuk diagnosis pasti."
            }
        
        # Level 4: ROUTINE - Sudah terdiagnosis, kontrol rutin
        if entities.get("diabetes_status") == "diagnosed":
            return {
                "urgency_level": "routine",
                "recommended_action": "Lanjutkan pengobatan dan kontrol rutin sesuai jadwal dokter",
                "refer_to": "Dokter / Endokrinolog",
                "notes": "Pastikan minum obat teratur, jaga pola makan, dan pantau gula darah."
            }
        
        # Level 5: EDUCATION - Pertanyaan umum
        return {
            "urgency_level": "education",
            "recommended_action": "Edukasi dan informasi umum",
            "refer_to": "AI Assistant / Website",
            "notes": "Untuk pertanyaan lebih spesifik, konsultasikan ke dokter."
        }