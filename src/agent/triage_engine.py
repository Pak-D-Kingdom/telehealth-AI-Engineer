from typing import Dict, Any, List, Tuple
from src.agent.intake_parser import IntakeParser


class TriageEngine:
    GD_HYPOGLYCEMIA = 70
    GD_WARNING_HIGH = 200
    GD_DANGER_HIGH = 300
    GD_EMERGENCY_HIGH = 400

    HBA1C_NORMAL = 5.7
    HBA1C_PREDIABETES = 6.5
    HBA1C_TARGET_DM = 7.0
    HBA1C_DANGER = 9.0

    RED_FLAG_SYMPTOMS = {
        "pingsan": "penurunan_kesadaran",
        "tidak sadar": "penurunan_kesadaran",
        "kejang": "penurunan_kesadaran",
        "sesak napas": "kardiovaskular",
        "nyeri dada": "kardiovaskular",
        "jantung berdebar": "kardiovaskular",
        "napas bau buah": "ketoasidosis",
        "napas bau aseton": "ketoasidosis",
        "muntah terus": "ketoasidosis",
        "muntah darah": "kardiovaskular",
        "nyeri perut hebat": "ketoasidosis",
        "keringat dingin": "hipoglikemia",
        "gemetar hebat": "hipoglikemia",
        "luka hitam": "gangren",
        "luka busuk": "gangren",
        "gangren": "gangren",
        "kaki mati rasa": "neuropati_berat",
        "buta mendadak": "retinopati",
        "pandangan hilang": "retinopati",
    }

    WARNING_SYMPTOMS = {
        "pandangan kabur": "retinopati_awal",
        "kesemutan": "neuropati",
        "kebas": "neuropati",
        "luka tidak sembuh": "ulkus",
        "luka lama sembuh": "ulkus",
        "sering kencing": "gejala_klasik",
        "sering haus": "gejala_klasik",
        "berat badan turun": "gejala_klasik",
        "lemas": "gejala_umum",
        "mudah lelah": "gejala_umum",
        "gatal": "gejala_kulit",
    }

    def __init__(self):
        self.parser = IntakeParser()

    def process(self, raw_intake: Dict[str, Any]) -> Dict[str, Any]:
        parsed = self.parser.parse(raw_intake)

        red_flags, red_flag_details = self._detect_red_flags(parsed)
        warnings, warning_details = self._detect_warnings(parsed)
        gd_analysis = self._analyze_blood_sugar(parsed)
        hba1c_analysis = self._analyze_hba1c(parsed)
        risk_factors = self._analyze_risk_factors(parsed)

        risk_score = self._calculate_risk_score(
            red_flags, warnings, gd_analysis, hba1c_analysis, risk_factors
        )

        risk_level = self._determine_risk_level(risk_score, red_flags)
        recommended_action = self._determine_action(risk_level, red_flag_details)

        result = {
            "patient_info": {
                "nama": parsed["nama"],
                "usia": parsed["usia"],
                "jenis_kelamin": parsed["jenis_kelamin"],
                "bmi": parsed["bmi"],
                "bmi_category": parsed["bmi_category"],
                "usia_category": parsed["usia_category"],
            },
            "diabetes_info": {
                "sudah_terdiagnosis": parsed["sudah_terdiagnosis"],
                "tipe_diabetes": parsed.get("tipe_diabetes"),
                "gula_darah_terakhir": parsed.get("gula_darah_terakhir"),
                "hba1c": parsed.get("hba1c"),
                "obat_saat_ini": parsed.get("obat_saat_ini", []),
            },
            "triage_result": {
                "risk_level": risk_level,
                "risk_score": risk_score,
                "red_flags": red_flag_details,
                "warnings": warning_details,
                "blood_sugar_analysis": gd_analysis,
                "hba1c_analysis": hba1c_analysis,
                "risk_factors": risk_factors,
            },
            "recommended_action": recommended_action,
            "proceed_to_doctor": risk_level != "CRITICAL",
        }

        return result

    def _detect_red_flags(self, data: Dict) -> Tuple[List[str], List[Dict]]:
        flags = []
        details = []

        for gejala in data.get("gejala", []):
            for keyword, category in self.RED_FLAG_SYMPTOMS.items():
                if keyword in gejala:
                    if category not in flags:
                        flags.append(category)
                        details.append({
                            "type": category,
                            "source": "gejala",
                            "description": f"Gejala '{gejala}' mengindikasikan {category}",
                            "severity": "critical"
                        })

        gd = data.get("gula_darah_terakhir")
        if gd is not None:
            if gd <= self.GD_HYPOGLYCEMIA:
                flags.append("hipoglikemia")
                details.append({
                    "type": "hipoglikemia",
                    "source": "gula_darah",
                    "description": f"Gula darah {gd} mg/dL (hipoglikemia berat)",
                    "severity": "critical"
                })
            elif gd >= self.GD_EMERGENCY_HIGH:
                flags.append("hiperglikemia_ekstrem")
                details.append({
                    "type": "hiperglikemia_ekstrem",
                    "source": "gula_darah",
                    "description": f"Gula darah {gd} mg/dL (risiko KAD/HHNK)",
                    "severity": "critical"
                })

        if data.get("sedang_hamil") and data.get("sudah_terdiagnosis"):
            flags.append("diabetes_gestasional_risiko")
            details.append({
                "type": "diabetes_gestasional_risiko",
                "source": "riwayat",
                "description": "Pasien hamil dengan diabetes - perlu penanganan khusus",
                "severity": "high"
            })

        return flags, details

    def _detect_warnings(self, data: Dict) -> Tuple[List[str], List[Dict]]:
        warnings = []
        details = []

        for gejala in data.get("gejala", []):
            for keyword, category in self.WARNING_SYMPTOMS.items():
                if keyword in gejala:
                    if category not in warnings:
                        warnings.append(category)
                        details.append({
                            "type": category,
                            "source": "gejala",
                            "description": f"Gejala '{gejala}' perlu evaluasi lebih lanjut",
                            "severity": "warning"
                        })

        gd = data.get("gula_darah_terakhir")
        if gd is not None:
            if self.GD_WARNING_HIGH <= gd < self.GD_DANGER_HIGH:
                warnings.append("hiperglikemia")
                details.append({
                    "type": "hiperglikemia",
                    "source": "gula_darah",
                    "description": f"Gula darah {gd} mg/dL (di atas target)",
                    "severity": "warning"
                })

        td = data.get("tekanan_darah")
        if td:
            try:
                systolic = int(td.split("/")[0])
                if systolic >= 140:
                    warnings.append("hipertensi")
                    details.append({
                        "type": "hipertensi",
                        "source": "tekanan_darah",
                        "description": f"Tekanan darah {td} mmHg (hipertensi)",
                        "severity": "warning"
                    })
            except (IndexError, ValueError):
                pass

        return warnings, details

    def _analyze_blood_sugar(self, data: Dict) -> Dict[str, Any]:
        gd = data.get("gula_darah_terakhir")
        jenis_cek = data.get("jenis_cek_gula") or "sewaktu"

        if gd is None:
            return {
                "status": "tidak_ada_data",
                "nilai": None,
                "kategori": "belum_cek",
                "rekomendasi": "Perlu pemeriksaan gula darah"
            }

        if gd <= self.GD_HYPOGLYCEMIA:
            kategori = "hipoglikemia"
        elif jenis_cek == "puasa":
            if gd < 100:
                kategori = "normal"
            elif gd < 126:
                kategori = "prediabetes"
            else:
                kategori = "diabetes"
        else:
            if gd < 140:
                kategori = "normal"
            elif gd < 200:
                kategori = "tinggi"
            else:
                kategori = "diabetes"

        return {
            "status": "ada_data",
            "nilai": gd,
            "jenis_cek": jenis_cek,
            "kategori": kategori,
            "rekomendasi": self._gd_recommendation(kategori)
        }

    def _gd_recommendation(self, kategori: str) -> str:
        recs = {
            "hipoglikemia": "Gula darah SANGAT RENDAH. Kondisi darurat. Segera konsumsi gula sederhana dan cari pertolongan medis.",
            "normal": "Gula darah dalam batas normal. Pertahankan pola hidup sehat.",
            "prediabetes": "Gula darah di rentang prediabetes. Perlu perubahan gaya hidup dan monitoring.",
            "tinggi": "Gula darah di atas target. Perlu evaluasi terapi dan gaya hidup.",
            "diabetes": "Gula darah di atas ambang diabetes. Perlu konsultasi dokter untuk penanganan.",
            "belum_cek": "Belum ada data gula darah. Disarankan untuk cek di laboratorium.",
        }
        return recs.get(kategori, "")

    def _analyze_hba1c(self, data: Dict) -> Dict[str, Any]:
        hba1c = data.get("hba1c")

        if hba1c is None:
            return {
                "status": "tidak_ada_data",
                "nilai": None,
                "kategori": "belum_cek",
                "rekomendasi": "Perlu pemeriksaan HbA1c"
            }

        if hba1c < self.HBA1C_NORMAL:
            kategori = "normal"
        elif hba1c < self.HBA1C_PREDIABETES:
            kategori = "prediabetes"
        elif hba1c < self.HBA1C_TARGET_DM:
            kategori = "target_dm_tercapai"
        elif hba1c < self.HBA1C_DANGER:
            kategori = "kontrol_kurang"
        else:
            kategori = "kontrol_buruk"

        return {
            "status": "ada_data",
            "nilai": hba1c,
            "kategori": kategori,
            "rekomendasi": self._hba1c_recommendation(kategori)
        }

    def _hba1c_recommendation(self, kategori: str) -> str:
        recs = {
            "normal": "HbA1c normal.",
            "prediabetes": "HbA1c di rentang prediabetes. Perlu intervensi gaya hidup.",
            "target_dm_tercapai": "HbA1c dalam target DM. Pertahankan terapi.",
            "kontrol_kurang": "HbA1c di atas target. Perlu evaluasi dan penyesuaian terapi.",
            "kontrol_buruk": "HbA1c sangat tinggi. Risiko komplikasi tinggi. Perlu penanganan intensif.",
            "belum_cek": "Belum ada data HbA1c. Disarankan pemeriksaan HbA1c.",
        }
        return recs.get(kategori, "")

    def _analyze_risk_factors(self, data: Dict) -> List[Dict]:
        factors = []

        if data["usia"] >= 45:
            factors.append({
                "type": "usia",
                "description": f"Usia {data['usia']} tahun (risiko meningkat di atas 45)",
                "weight": 10
            })

        bmi_cat = data.get("bmi_category", "")
        if bmi_cat in ["overweight", "obese_1", "obese_2"]:
            factors.append({
                "type": "obesitas",
                "description": f"BMI {data['bmi']} ({bmi_cat})",
                "weight": 15 if bmi_cat == "obese_2" else 10
            })

        if data.get("has_family_history"):
            factors.append({
                "type": "riwayat_keluarga",
                "description": f"Riwayat diabetes dalam keluarga: {data.get('riwayat_keluarga')}",
                "weight": 15
            })

        td = data.get("tekanan_darah")
        if td:
            try:
                systolic = int(td.split("/")[0])
                if systolic >= 140:
                    factors.append({
                        "type": "hipertensi",
                        "description": f"Tekanan darah {td} mmHg",
                        "weight": 10
                    })
            except (IndexError, ValueError):
                pass

        for penyakit in data.get("riwayat_penyakit_lain", []):
            factors.append({
                "type": "komorbiditas",
                "description": f"Riwayat penyakit: {penyakit}",
                "weight": 5
            })

        return factors

    def _calculate_risk_score(
        self,
        red_flags: List[str],
        warnings: List[str],
        gd_analysis: Dict,
        hba1c_analysis: Dict,
        risk_factors: List[Dict]
    ) -> int:
        score = 0

        score += len(red_flags) * 30
        score += len(warnings) * 10

        gd_kategori = gd_analysis.get("kategori", "")
        gd_scores = {
            "diabetes": 20,
            "tinggi": 15,
            "prediabetes": 10,
            "normal": 0,
        }
        score += gd_scores.get(gd_kategori, 0)

        hba1c_kategori = hba1c_analysis.get("kategori", "")
        hba1c_scores = {
            "kontrol_buruk": 25,
            "kontrol_kurang": 15,
            "target_dm_tercapai": 5,
            "prediabetes": 10,
            "normal": 0,
        }
        score += hba1c_scores.get(hba1c_kategori, 0)

        for factor in risk_factors:
            score += factor.get("weight", 5)

        return min(score, 100)

    def _determine_risk_level(self, score: int, red_flags: List[str]) -> str:
        critical_flags = [
            "penurunan_kesadaran", "kardiovaskular", "ketoasidosis",
            "hipoglikemia", "hiperglikemia_ekstrem", "gangren"
        ]
        if any(f in critical_flags for f in red_flags):
            return "CRITICAL"

        if score >= 70:
            return "HIGH"
        elif score >= 40:
            return "MEDIUM"
        else:
            return "LOW"

    def _determine_action(self, risk_level: str, red_flag_details: List[Dict]) -> Dict:
        if risk_level == "CRITICAL":
            return {
                "type": "emergency_referral",
                "priority": "immediate",
                "description": "KONDISI DARURAT. Rujuk segera ke IGD/Faskes terdekat.",
                "block_async_consultation": True,
                "refer_to": "IGD / Emergency Room"
            }
        elif risk_level == "HIGH":
            return {
                "type": "urgent_doctor_review",
                "priority": "high",
                "description": "Risiko tinggi. Perlu review dokter segera (hari ini).",
                "block_async_consultation": False,
                "refer_to": "Dokter / Endokrinolog"
            }
        elif risk_level == "MEDIUM":
            return {
                "type": "doctor_review",
                "priority": "normal",
                "description": "Risiko sedang. Perlu review dokter dalam 1-3 hari.",
                "block_async_consultation": False,
                "refer_to": "Dokter Umum / Endokrinolog"
            }
        else:
            return {
                "type": "routine_follow_up",
                "priority": "low",
                "description": "Risiko rendah. Lanjutkan monitoring rutin dan edukasi.",
                "block_async_consultation": False,
                "refer_to": "AI Assistant / Monitoring Rutin"
            }