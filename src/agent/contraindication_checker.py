from typing import Dict, Any, List


class ContraindicationChecker:

    ABSOLUTE_CONTRAINDICATIONS = {
        "metformin": [
            "gangguan_ginjal_berat",
            "asidosis_metabolik",
            "gagal_jantung_berat",
            "kehamilan",
        ],
        "sulfonilurea": [
            "dm_tipe_1",
            "kehamilan",
            "alergi_sulfonamid",
            "gangguan_ginjal_berat",
        ],
        "dpp4_inhibitor": [],
        "sglt2_inhibitor": [
            "egfr_di_bawah_20",
            "ketoasidosis",
            "kehamilan",
        ],
        "insulin": [],
    }

    CONDITION_WARNINGS = {
        "lansia": {
            "sulfonilurea": "Risiko hipoglikemia tinggi pada lansia. Hindari jika memungkinkan.",
            "insulin": "Perlu monitoring ketat, risiko hipoglikemia.",
        },
        "obesitas": {
            "sulfonilurea": "Dapat menyebabkan kenaikan berat badan.",
            "insulin": "Dapat menyebabkan kenaikan berat badan.",
        },
        "kehamilan": {
            "metformin": "Hanya insulin yang benar-benar aman untuk kehamilan.",
            "sulfonilurea": "KONTRAINDIKASI pada kehamilan.",
            "dpp4_inhibitor": "KONTRAINDIKASI pada kehamilan.",
            "sglt2_inhibitor": "KONTRAINDIKASI pada kehamilan.",
        },
        "gangguan_ginjal": {
            "metformin": "Perlu penyesuaian dosis. Kontraindikasi jika eGFR < 30.",
            "sulfonilurea": "Risiko hipoglikemia meningkat.",
            "sglt2_inhibitor": "Tidak efektif jika eGFR < 20.",
        },
        "penyakit_kardiovaskular": {
            "sulfonilurea": "Beberapa studi menunjukkan risiko kardiovaskular.",
        },
    }

    def check(
        self,
        proposed_medications: List[str],
        patient_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        results = {
            "safe_medications": [],
            "contraindicated": [],
            "warnings": [],
            "recommendations": []
        }

        for med in proposed_medications:
            med_key = self._normalize_med_name(med)

            contraindications = self._check_absolute(med_key, patient_conditions)
            if contraindications:
                results["contraindicated"].append({
                    "medication": med,
                    "reasons": contraindications
                })
                continue

            warnings = self._check_warnings(med_key, patient_conditions)
            if warnings:
                results["warnings"].append({
                    "medication": med,
                    "warnings": warnings
                })

            results["safe_medications"].append(med)

        results["recommendations"] = self._generate_recommendations(patient_conditions)

        return results

    def _normalize_med_name(self, med: str) -> str:
        med_lower = med.lower()

        if any(kw in med_lower for kw in ["metformin", "biguanid"]):
            return "metformin"
        elif any(kw in med_lower for kw in ["glibenclamide", "glimepiride", "gliclazide", "sulfonilurea", "sulfonylurea"]):
            return "sulfonilurea"
        elif any(kw in med_lower for kw in ["sitagliptin", "vildagliptin", "linagliptin", "saxagliptin", "dpp4", "dpp-4", "gliptin"]):
            return "dpp4_inhibitor"
        elif any(kw in med_lower for kw in ["empagliflozin", "dapagliflozin", "canagliflozin", "sglt2", "sglt-2", "gliflozin"]):
            return "sglt2_inhibitor"
        elif any(kw in med_lower for kw in ["insulin", "glargine", "detemir", "aspart", "lispro", "nph", "regular"]):
            return "insulin"

        return med_lower

    def _check_absolute(self, med_key: str, conditions: Dict) -> List[str]:
        contraindications = []
        abs_list = self.ABSOLUTE_CONTRAINDICATIONS.get(med_key, [])

        for contra in abs_list:
            if contra == "kehamilan" and conditions.get("sedang_hamil"):
                contraindications.append("Kehamilan")
            elif contra == "dm_tipe_1" and conditions.get("tipe_diabetes") == "tipe1":
                contraindications.append("DM Tipe 1")
            elif contra == "alergi_sulfonamid" and self._check_allergy(conditions, "sulfonamid"):
                contraindications.append("Alergi sulfonamid")
            elif contra == "gangguan_ginjal_berat" and conditions.get("egfr_di_bawah_30"):
                contraindications.append("Gangguan ginjal berat (eGFR < 30)")
            elif contra == "asidosis_metabolik" and conditions.get("asidosis"):
                contraindications.append("Asidosis metabolik")
            elif contra == "gagal_jantung_berat" and conditions.get("gagal_jantung"):
                contraindications.append("Gagal jantung berat")
            elif contra == "egfr_di_bawah_20" and conditions.get("egfr_di_bawah_20"):
                contraindications.append("eGFR < 20 mL/min")
            elif contra == "ketoasidosis" and conditions.get("ketoasidosis"):
                contraindications.append("Ketoasidosis diabetik")

        return contraindications

    def _check_warnings(self, med_key: str, conditions: Dict) -> List[str]:
        warnings = []

        if conditions.get("usia", 0) >= 65:
            lansia_warnings = self.CONDITION_WARNINGS.get("lansia", {})
            if med_key in lansia_warnings:
                warnings.append(f"[Lansia] {lansia_warnings[med_key]}")

        bmi = conditions.get("bmi")
        if bmi and bmi >= 25:
            obesitas_warnings = self.CONDITION_WARNINGS.get("obesitas", {})
            if med_key in obesitas_warnings:
                warnings.append(f"[Obesitas] {obesitas_warnings[med_key]}")

        if conditions.get("sedang_hamil"):
            hamil_warnings = self.CONDITION_WARNINGS.get("kehamilan", {})
            if med_key in hamil_warnings:
                warnings.append(f"[Kehamilan] {hamil_warnings[med_key]}")

        if conditions.get("gangguan_ginjal"):
            ginjal_warnings = self.CONDITION_WARNINGS.get("gangguan_ginjal", {})
            if med_key in ginjal_warnings:
                warnings.append(f"[Ginjal] {ginjal_warnings[med_key]}")

        if conditions.get("penyakit_kardiovaskular"):
            cv_warnings = self.CONDITION_WARNINGS.get("penyakit_kardiovaskular", {})
            if med_key in cv_warnings:
                warnings.append(f"[Kardiovaskular] {cv_warnings[med_key]}")

        return warnings

    def _check_allergy(self, conditions: Dict, allergy_keyword: str) -> bool:
        alergi = conditions.get("alergi", "")
        if not alergi:
            return False
        return allergy_keyword in alergi.lower()

    def _generate_recommendations(self, conditions: Dict) -> List[str]:
        recommendations = []

        if conditions.get("sedang_hamil"):
            recommendations.append("Pasien hamil: INSULIN adalah satu-satunya terapi yang aman.")

        if conditions.get("usia", 0) >= 65:
            recommendations.append("Pasien lansia: hindari Sulfonilurea, pilih DPP-4i atau SGLT2i.")

        bmi = conditions.get("bmi")
        if bmi and bmi >= 25:
            recommendations.append("Pasien obesitas: Metformin + SGLT2i/GLP-1 RA direkomendasikan.")

        if conditions.get("penyakit_kardiovaskular"):
            recommendations.append("Pasien dengan penyakit kardiovaskular: SGLT2i atau GLP-1 RA terbukti kardioprotektif.")

        if conditions.get("gangguan_ginjal"):
            recommendations.append("Pasien dengan gangguan ginjal: perhatikan penyesuaian dosis, Linagliptin aman untuk semua tahap CKD.")

        if conditions.get("tipe_diabetes") == "tipe1":
            recommendations.append("Pasien DM Tipe 1: INSULIN WAJIB, obat oral tidak efektif.")

        return recommendations