class DiabetesEngine:
    EMERGENCY_KEYWORDS = [
        "pingsan", "tidak sadar", "kejang",
        "keringat dingin", "gemetar hebat",
        "napas bau buah", "napas cepat",
        "muntah terus", "muntah darah",
        "nyeri dada", "sesak napas",
        "luka hitam", "luka busuk", "gangren",
        "kaki mati rasa total",
        "pandangan kabur mendadak", "buta mendadak"
    ]
    
    CLASSIC_SYMPTOMS = [
        "sering kencing", "poliuria", "kencing malam",
        "sering haus", "polidipsia", "haus terus",
        "sering lapar", "polifagia", "lapar terus",
        "berat badan turun", "bb turun", "kurus mendadak",
        "lemas", "mudah lelah",
        "pandangan kabur",
        "kesemutan", "kebas", "mati rasa",
        "luka tidak sembuh", "luka lama sembuh"
    ]
    
    BLOOD_SUGAR_REFERENCE = {
        "fasting_normal": "< 100 mg/dL",
        "fasting_prediabetes": "100-125 mg/dL",
        "fasting_diabetes": ">= 126 mg/dL",
        "random_normal": "< 140 mg/dL",
        "random_diabetes": ">= 200 mg/dL",
        "hba1c_normal": "< 5.7%",
        "hba1c_prediabetes": "5.7% - 6.4%",
        "hba1c_diabetes": ">= 6.5%",
        "hypoglycemia": "< 70 mg/dL"
    }
    
    def detect_emergency(self, message: str) -> tuple:
        message_lower = message.lower()
        detected = []
        
        for keyword in self.EMERGENCY_KEYWORDS:
            if keyword in message_lower:
                detected.append(keyword)
        
        return len(detected) > 0, detected
    
    def detect_classic_symptoms(self, message: str) -> list:
        message_lower = message.lower()
        detected = []
        
        for symptom in self.CLASSIC_SYMPTOMS:
            if symptom in message_lower:
                detected.append(symptom)
        
        return detected
    
    def get_blood_sugar_education(self, value: int, measurement_type: str = "random") -> str:
        if value < 70:
            return (
                f"Angka {value} mg/dL termasuk RENDAH (hipoglikemia). "
                "Jika disertai gejala seperti gemetar, keringat dingin, atau bingung, "
                "segera konsumsi gula sederhana (air manis/permen) dan periksakan ke dokter."
            )
        elif measurement_type == "fasting":
            if value < 100:
                return f"Angka {value} mg/dL (puasa) berada dalam rentang normal (< 100 mg/dL)."
            elif value <= 125:
                return (
                    f"Angka {value} mg/dL (puasa) berada di rentang prediabetes (100-125 mg/dL). "
                    "Sebaiknya konsultasi ke dokter untuk evaluasi lebih lanjut."
                )
            else:
                return (
                    f"Angka {value} mg/dL (puasa) di atas nilai referensi normal (>= 126 mg/dL). "
                    "Sangat disarankan untuk segera konsultasi ke dokter."
                )
        else:
            if value < 140:
                return f"Angka {value} mg/dL berada dalam rentang normal untuk gula darah sewaktu."
            elif value < 200:
                return (
                    f"Angka {value} mg/dL sedikit di atas referensi normal. "
                    "Sebaiknya periksakan lebih lanjut ke dokter."
                )
            else:
                return (
                    f"Angka {value} mg/dL di atas nilai referensi normal (>= 200 mg/dL). "
                    "Sangat disarankan untuk segera konsultasi ke dokter."
                )
    
    def get_intake_questions(self, collected_entities: dict) -> list:
        questions = []
        
        if not collected_entities.get("diabetes_status"):
            questions.append("Apakah Kakak sudah pernah didiagnosis diabetes oleh dokter?")
        
        if not collected_entities.get("symptoms"):
            questions.append("Gejala apa yang Kakak rasakan saat ini?")
        
        if not collected_entities.get("blood_sugar_info"):
            questions.append("Kapan terakhir kali cek gula darah? Berapa hasilnya?")
        
        if not collected_entities.get("medications"):
            questions.append("Apakah saat ini sedang mengonsumsi obat diabetes atau insulin?")
        
        if not collected_entities.get("has_doctor"):
            questions.append("Apakah Kakak sedang dalam perawatan dokter?")
        
        return questions
    
    def get_lifestyle_recommendation(self, diabetes_type: str, symptoms: list) -> list:
        recommendations = []
        
        recommendations.append("Konsultasikan pola makan dengan dokter atau ahli gizi.")
        recommendations.append("Lakukan aktivitas fisik ringan seperti jalan kaki 30 menit per hari.")
        recommendations.append("Pantau gula darah secara rutin sesuai anjuran dokter.")
        recommendations.append("Periksa kaki setiap hari untuk mendeteksi luka dini.")
        recommendations.append("Kelola stres dengan baik.")
        
        if "kesemutan" in symptoms or "kebas" in symptoms:
            recommendations.append("Karena ada gejala kesemutan/kebas, sangat penting untuk memeriksakan kaki secara rutin ke dokter.")
        
        if "luka tidak sembuh" in symptoms:
            recommendations.append("Karena ada luka yang sulit sembuh, SEGERA periksakan ke dokter untuk penanganan lebih lanjut.")
        
        return recommendations