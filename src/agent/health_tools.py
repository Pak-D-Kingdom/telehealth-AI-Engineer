from typing import Dict, Any, List


class GlucoseAnalyzer:
    FASTING_NORMAL = 100
    FASTING_TARGET = 130
    POSTPRANDIAL_TARGET = 180
    HYPO_THRESHOLD = 70

    def analyze(self, readings: List[Dict]) -> Dict[str, Any]:
        if not readings:
            return {"error": "Tidak ada data gula darah."}

        fasting = [r["value"] for r in readings if r.get("type") == "puasa"]
        post = [r["value"] for r in readings if r.get("type") == "setelah_makan"]
        all_vals = [r["value"] for r in readings]

        avg_fasting = round(sum(fasting) / len(fasting), 1) if fasting else None
        avg_post = round(sum(post) / len(post), 1) if post else None
        overall = round(sum(all_vals) / len(all_vals), 1)

        estimated_hba1c = round((overall + 46.7) / 28.7, 1)

        patterns = []
        if avg_fasting and avg_fasting > self.FASTING_TARGET:
            patterns.append("Gula darah puasa cenderung tinggi")
        if avg_post and avg_post > self.POSTPRANDIAL_TARGET:
            patterns.append("Spike setelah makan (postprandial tinggi)")
        if avg_fasting and avg_post and (avg_post - avg_fasting) > 60:
            patterns.append("Lonjakan besar setelah makan")
        if avg_fasting and avg_fasting > 130 and avg_post and avg_post < 160:
            patterns.append("Kemungkinan dawn phenomenon (puasa tinggi, siang normal)")

        hypo_events = [v for v in all_vals if v < self.HYPO_THRESHOLD]
        hyper_events = [v for v in all_vals if v > 180]
        variability = max(all_vals) - min(all_vals)
        if variability > 100:
            patterns.append("Variabilitas tinggi (gula darah naik-turun drastis)")

        assessment = self._build_assessment(avg_fasting, avg_post, estimated_hba1c, patterns)

        return {
            "count": len(all_vals),
            "average_fasting": avg_fasting,
            "average_postprandial": avg_post,
            "overall_average": overall,
            "estimated_hba1c": estimated_hba1c,
            "patterns": patterns,
            "hypoglycemia_events": len(hypo_events),
            "hyperglycemia_events": len(hyper_events),
            "variability": variability,
            "assessment": assessment,
            "advice": self._build_advice(patterns, hypo_events),
            "suggested_questions": [
                "Bagaimana cara menurunkan HbA1c?",
                "Makanan apa yang tidak bikin spike?",
                "Kapan waktu terbaik cek gula darah?"
            ]
        }

    def _build_assessment(self, avg_fasting, avg_post, hba1c, patterns):
        parts = []
        if avg_fasting:
            status = "terkontrol" if avg_fasting <= self.FASTING_TARGET else "di atas target"
            parts.append(f"Rata-rata puasa {avg_fasting} mg/dL ({status}).")
        if avg_post:
            status = "terkontrol" if avg_post <= self.POSTPRANDIAL_TARGET else "di atas target"
            parts.append(f"Rata-rata setelah makan {avg_post} mg/dL ({status}).")
        if hba1c:
            cat = "baik" if hba1c < 7 else "perlu perbaikan"
            parts.append(f"Estimasi HbA1c {hba1c}% ({cat}, target umum <7%).")
        if patterns:
            parts.append("Pola terdeteksi: " + "; ".join(patterns) + ".")
        return " ".join(parts)

    def _build_advice(self, patterns, hypo_events):
        if hypo_events:
            return "Ada episode hipoglikemia. Konsultasikan penyesuaian obat/dosis ke dokter dan selalu bawa sumber gula cepat."
        if not patterns:
            return "Pola gula darah Anda terlihat stabil. Pertahankan pola makan dan aktivitas saat ini."
        if any("setelah makan" in p for p in patterns):
            return "Fokus kurangi karbohidrat sederhana saat makan dan jalan kaki 10-15 menit setelah makan untuk meredam spike."
        if any("puasa" in p for p in patterns):
            return "Perhatikan makan malam dan camilan sebelum tidur. Diskusikan dengan dokter bila puasa sering tinggi."
        return "Diskusikan pola ini dengan dokter untuk evaluasi terapi."


class RiskCalculator:
    def calculate_findrisc(self, data: Dict[str, Any]) -> Dict[str, Any]:
        score = 0
        breakdown = []

        age = data.get("age", 0)
        age_pts = 0 if age < 45 else 2 if age < 55 else 3 if age < 65 else 4
        score += age_pts
        breakdown.append({"factor": "Usia", "points": age_pts})

        bmi = data.get("bmi", 0)
        bmi_pts = 0 if bmi < 25 else 1 if bmi < 30 else 3
        score += bmi_pts
        breakdown.append({"factor": "BMI", "points": bmi_pts})

        waist = data.get("waist_cm", 0)
        gender = data.get("gender", "male")
        if gender == "male":
            waist_pts = 0 if waist < 94 else 3 if waist <= 102 else 4
        else:
            waist_pts = 0 if waist < 80 else 3 if waist <= 88 else 4
        score += waist_pts
        breakdown.append({"factor": "Lingkar perut", "points": waist_pts})

        veg = 1 if not data.get("eat_vegetables_daily") else 0
        score += veg
        breakdown.append({"factor": "Sayur/harian", "points": veg})

        act = 0 if data.get("physical_activity") else 2
        score += act
        breakdown.append({"factor": "Aktivitas fisik", "points": act})

        ht = 2 if data.get("hypertension_medication") else 0
        score += ht
        breakdown.append({"factor": "Obat hipertensi", "points": ht})

        hbg = 5 if data.get("high_blood_glucose_history") else 0
        score += hbg
        breakdown.append({"factor": "Riwayat gula tinggi", "points": hbg})

        fam = data.get("family_history", "none")
        fam_pts = 0 if fam == "none" else 3 if fam == "extended" else 5
        score += fam_pts
        breakdown.append({"factor": "Riwayat keluarga", "points": fam_pts})

        category, advice = self._interpret(score)

        return {
            "score": score,
            "category": category,
            "breakdown": breakdown,
            "advice": advice,
            "suggested_questions": [
                "Bagaimana cara mencegah diabetes?",
                "Seberapa sering saya perlu screening?",
                "Apa gejala awal diabetes?"
            ]
        }

    def _interpret(self, score):
        if score < 7:
            return "Rendah", "Risiko rendah. Pertahankan gaya hidup sehat dan screening rutin tiap 1-3 tahun."
        if score < 12:
            return "Sedikit Meningkat", "Risiko sedikit meningkat. Perbaiki pola makan dan aktivitas, screening tahunan."
        if score < 15:
            return "Sedang", "Risiko sedang. Disarankan cek gula darah dan konsultasi pola hidup."
        if score < 21:
            return "Tinggi", "Risiko tinggi. Sangat disarankan cek gula darah/HbA1c dan konsultasi dokter."
        return "Sangat Tinggi", "Risiko sangat tinggi. Segera lakukan pemeriksaan gula darah dan konsultasi dokter."


class InteractionChecker:
    INTERACTIONS = {
        ("metformin", "alkohol"): ("tinggi", "Meningkatkan risiko asidosis laktat. Batasi alkohol."),
        ("metformin", "kontras iodine"): ("tinggi", "Risiko asidosis laktat saat prosedur kontras. Informasikan dokter Anda minum metformin."),
        ("glibenclamide", "nsaid"): ("sedang", "NSAID (ibuprofen dll) dapat memperkuat efek hipoglikemia sulfonilurea."),
        ("glimepiride", "nsaid"): ("sedang", "NSAID dapat memperkuat efek hipoglikemia sulfonilurea."),
        ("glibenclamide", "warfarin"): ("tinggi", "Meningkatkan risiko hipoglikemia dan perdarahan. Perlu monitoring ketat."),
        ("glibenclamide", "beta blocker"): ("sedang", "Beta-blocker dapat menutupi gejala hipoglikemia."),
        ("insulin", "beta blocker"): ("sedang", "Beta-blocker dapat menutupi gejala hipoglikemia."),
        ("insulin", "alkohol"): ("sedang", "Alkohol meningkatkan risiko hipoglikemia, terutama saat perut kosong."),
        ("sglt2", "diuretik"): ("sedang", "Meningkatkan risiko dehidrasi dan tekanan darah rendah. Pastikan hidrasi."),
        ("metformin", "cimetidine"): ("sedang", "Cimetidine dapat meningkatkan kadar metformin."),
    }

    ALIASES = {
        "ibuprofen": "nsaid", "asam mefenamat": "nsaid", "diclofenac": "nsaid", "naproxen": "nsaid",
        "propranolol": "beta blocker", "atenolol": "beta blocker", "bisoprolol": "beta blocker",
        "furosemide": "diuretik", "hidroklorotiazid": "diuretik", "hct": "diuretik",
        "empagliflozin": "sglt2", "dapagliflozin": "sglt2", "canagliflozin": "sglt2",
    }

    def check(self, medications: List[str]) -> Dict[str, Any]:
        normalized = [self._normalize(m) for m in medications]
        found = []

        for i in range(len(normalized)):
            for j in range(i + 1, len(normalized)):
                a, b = normalized[i], normalized[j]
                key = (a, b) if (a, b) in self.INTERACTIONS else (b, a)
                if key in self.INTERACTIONS:
                    severity, desc = self.INTERACTIONS[key]
                    found.append({
                        "pair": [medications[i], medications[j]],
                        "severity": severity,
                        "description": desc
                    })

        return {
            "medications": medications,
            "interactions": found,
            "has_interaction": len(found) > 0,
            "advice": self._advice(found),
            "suggested_questions": [
                "Kapan sebaiknya minum obat diabetes?",
                "Apa efek samping obat saya?",
                "Bolehkah minum obat saat puasa?"
            ]
        }

    def _normalize(self, med: str) -> str:
        med_lower = med.lower()
        for alias, canonical in self.ALIASES.items():
            if alias in med_lower:
                return canonical
        return med_lower

    def _advice(self, found):
        if not found:
            return "Tidak ada interaksi signifikan terdeteksi antar obat yang Anda sebutkan. Tetap konsultasikan daftar obat lengkap ke dokter/apoteker."
        high = [f for f in found if f["severity"] == "tinggi"]
        if high:
            return "Ada interaksi tingkat TINGGI. Segera konsultasikan ke dokter atau apoteker sebelum melanjutkan kombinasi ini."
        return "Ada interaksi yang perlu diwaspadai. Diskusikan dengan dokter/apoteker dan pantau gejala hipoglikemia/dehidrasi."