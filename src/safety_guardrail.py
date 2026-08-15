class SafetyGuardrail:
    EMERGENCY_PATTERNS = {
        "hipoglikemia": [
            "gula darah rendah", "gula drop", "gemetar", "keringat dingin",
            "jantung berdebar", "pusing hebat", "pandangan gelap",
            "mau pingsan", "lemas mendadak", "gula di bawah 70"
        ],
        "ketoasidosis": [
            "napas bau buah", "napas bau aseton", "mual muntah hebat",
            "nyeri perut hebat", "napas cepat", "napas dalam",
            "kussmaul", "keton"
        ],
        "hiperglikemia_ekstrem": [
            "gula darah 400", "gula darah 500", "gula darah 600",
            "gula sangat tinggi", "dehidrasi berat", "sangat haus",
            "bingung", "disorientasi", "penurunan kesadaran"
        ],
        "luka_gangren": [
            "luka hitam", "luka busuk", "gangren", "jaringan mati",
            "kaki hitam", "jari hitam", "berbau busuk",
            "bernanah banyak", "demam tinggi luka"
        ],
        "kardiovaskular": [
            "nyeri dada", "sesak napas", "jantung berdebar tidak teratur",
            "nyeri lengan kiri", "keringat dingin nyeri dada"
        ],
        "neurologi": [
            "kejang", "tidak sadar", "pingsan", "sulit dibangunkan",
            "bicara pelo mendadak", "kelumpuhan mendadak"
        ],
        "mata": [
            "buta mendadak", "pandangan hilang tiba-tiba",
            "pandangan sangat kabur mendadak"
        ]
    }
    
    CAUTION_PATTERNS = [
        "luka tidak sembuh", "luka lama", "kebas", "mati rasa",
        "kesemutan terus", "hamil gula tinggi", "gula darah naik terus"
    ]
    
    def check(self, message: str) -> tuple:
        message_lower = message.lower()
        detected_flags = []
        
        for category, patterns in self.EMERGENCY_PATTERNS.items():
            for pattern in patterns:
                if pattern in message_lower:
                    detected_flags.append(f"{category}:{pattern}")
        
        if detected_flags:
            alert_message = self._get_emergency_message(detected_flags)
            return False, alert_message, detected_flags
        
        caution_flags = []
        for pattern in self.CAUTION_PATTERNS:
            if pattern in message_lower:
                caution_flags.append(pattern)
        
        if caution_flags:
            return True, None, caution_flags
        
        return True, None, []
    
    def _get_emergency_message(self, flags: list) -> str:
        base_message = (
            "Kondisi yang Kakak sebutkan memerlukan penanganan medis SEGERA.\n\n"
        )
        
        if any("hipoglikemia" in f for f in flags):
            base_message += (
                "TANDA HIPOGLIKEMIA (gula darah rendah):\n"
                "- Jika sadar: segera minum air manis atau makan permen.\n"
                "- Jika TIDAK sadar: JANGAN beri makan/minum, SEGERA ke IGD.\n"
                "- Cek gula darah lagi setelah 15 menit.\n\n"
            )
        
        if any("ketoasidosis" in f for f in flags):
            base_message += (
                "TANDA KETOASIDOSIS DIABETIK:\n"
                "- Ini adalah kondisi DARURAT yang mengancam jiwa.\n"
                "- SEGERA bawa ke IGD/Rumah Sakit.\n"
                "- Jangan tunda pertolongan medis.\n\n"
            )
        
        if any("hiperglikemia" in f for f in flags):
            base_message += (
                "TANDA HIPERGLIKEMIA EKSTREM:\n"
                "- Gula darah sangat tinggi memerlukan penanganan segera.\n"
                "- SEGERA ke dokter atau IGD.\n"
                "- Minum air putih yang banyak jika masih bisa.\n\n"
            )
        
        if any("gangren" in f for f in flags):
            base_message += (
                "TANDA INFEKSI/GANGREN PADA KAKI:\n"
                "- Luka dengan tanda ini memerlukan penanganan medis segera.\n"
                "- Risiko amputasi jika tidak ditangani.\n"
                "- SEGERA ke dokter atau IGD.\n\n"
            )
        
        base_message += (
            "SARAN: SEGERA kunjungi IGD atau fasilitas kesehatan terdekat.\n"
            "Jangan menunda pertolongan medis.\n\n"
            "Informasi ini bersifat edukatif dan tidak menggantikan penanganan medis profesional."
        )
        
        return base_message
    
    def is_pregnancy_related(self, message: str) -> bool:
        """Cek apakah pesan terkait kehamilan (perlu perhatian khusus)."""
        pregnancy_keywords = ["hamil", "mengandung", "bumil", "kehamilan", "trimester"]
        message_lower = message.lower()
        return any(kw in message_lower for kw in pregnancy_keywords)