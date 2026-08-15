import json
import traceback
from typing import Dict, Any, List
from datetime import datetime
from groq import Groq
from src.config import get_settings
from src.agent.clinical_summarizer import ClinicalSummarizer
from src.agent.contraindication_checker import ContraindicationChecker
from src.rag_service import get_rag_service


class PrescriptionDrafter:

    SYSTEM_PROMPT = """Kamu adalah AI Clinical Assistant yang membantu dokter menyusun DRAF resep untuk pasien diabetes.

PENTING: Ini adalah DRAF, bukan resep final. Dokter WAJIB memvalidasi dan menandatangani.

TUGASMU:
Berdasarkan clinical summary, drug knowledge base, dan hasil contraindication check, susun draf regimen terapi yang:
1. Sesuai guidelines (PERKENI)
2. Tidak melanggar kontraindikasi
3. Mempertimbangkan komorbid pasien
4. Menggunakan obat yang ada di drug knowledge base

ATURAN:
1. JANGAN meresepkan obat yang tidak ada di drug knowledge base.
2. JANGAN mengabaikan kontraindikasi yang terdeteksi.
3. JIKA pasien hamil, HANYA insulin yang boleh diresepkan.
4. JIKA pasien DM Tipe 1, INSULIN WAJIB.
5. Berikan rationale (alasan) untuk setiap obat yang dipilih.
6. Berikan instruksi pemakaian yang jelas.
7. Berikan monitoring yang diperlukan.
8. Berikan non-pharmacological recommendations (diet, olahraga, dll).

FORMAT OUTPUT (JSON):
{
  "diagnosis": "Diagnosis working berdasarkan assessment",
  "treatment_goals": ["List target terapi"],
  "medications": [
    {
      "medicine_name": "Nama obat",
      "dosage": "Dosis",
      "frequency": "Frekuensi pemakaian",
      "timing": "Waktu pemakaian (sebelum/sesudah makan, pagi/malam)",
      "duration": "Durasi terapi",
      "rationale": "Alasan pemilihan obat",
      "monitoring": "Monitoring yang diperlukan"
    }
  ],
  "non_pharmacological": [
    "Rekomendasi gaya hidup"
  ],
  "referrals": [
    "Rujukan ke spesialis jika perlu"
  ],
  "follow_up_schedule": "Jadwal kontrol berikutnya",
  "doctor_validation_notes": "Catatan penting untuk dokter yang memvalidasi"
}"""

    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan!")

        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama-3.3-70b-versatile"

        print("PrescriptionDrafter: Initializing ClinicalSummarizer...")
        self.clinical_summarizer = ClinicalSummarizer()
        print("PrescriptionDrafter: ClinicalSummarizer ready")
        
        self.contraindication_checker = ContraindicationChecker()
        print("PrescriptionDrafter: ContraindicationChecker ready")
        
        self.rag_service = get_rag_service()
        print("PrescriptionDrafter: RAGService ready")

    def generate_prescription(self, raw_intake: Dict[str, Any]) -> Dict[str, Any]:
        print("\n" + "="*60)
        print("PRESCRIPTION AGENT: Starting...")
        print("="*60)
        
        try:
            print("\n[STEP 1] Calling ClinicalSummarizer...")
            clinical_summary = self.clinical_summarizer.generate_summary(raw_intake)
            print("[STEP 1] Clinical summary generated successfully")
            
            print("\n[STEP 2] Extracting patient conditions...")
            patient_conditions = self._extract_conditions(raw_intake, clinical_summary)
            print(f"[STEP 2] Conditions: {patient_conditions}")
            
            print("\n[STEP 3] Planning candidate medications...")
            candidate_medications = self._plan_candidate_medications(raw_intake, clinical_summary)
            print(f"[STEP 3] Candidates: {candidate_medications}")
            
            print("\n[STEP 4] Checking contraindications...")
            contraindication_result = self.contraindication_checker.check(
                candidate_medications, patient_conditions
            )
            print(f"[STEP 4] Contraindication result: {len(contraindication_result.get('contraindicated', []))} contraindicated")
            
            print("\n[STEP 5] Searching drug knowledge base...")
            drug_context = self._search_drug_knowledge(candidate_medications, contraindication_result)
            print(f"[STEP 5] Drug context length: {len(drug_context)} chars")
            
            print("\n[STEP 6] Calling LLM for prescription draft...")
            prescription_draft = self._call_llm(
                clinical_summary,
                contraindication_result,
                drug_context
            )
            print(f"[STEP 6] Prescription draft generated: {type(prescription_draft)}")
            
            print("\n[STEP 7] Building final output...")
            final_output = {
                "prescription_draft": prescription_draft,
                "clinical_summary": clinical_summary.get("clinical_summary", {}),
                "triage_result": clinical_summary.get("triage_result", {}),
                "contraindication_check": contraindication_result,
                "patient_info": clinical_summary.get("patient_info", {}),
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "ai_model": self.model,
                    "status": "DRAFT - MENUNGGU VALIDASI DOKTER",
                    "doctor_signature": None,
                    "disclaimer": "DRAF ini dihasilkan oleh AI dan WAJIB divalidasi oleh dokter sebelum digunakan."
                }
            }
            
            print("\n" + "="*60)
            print("PRESCRIPTION AGENT: Completed successfully")
            print("="*60 + "\n")
            
            return final_output
            
        except Exception as e:
            print(f"\n[ERROR] Prescription Agent failed: {str(e)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            
            return {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "status": "FAILED"
            }

    def _extract_conditions(self, raw_intake: Dict, summary: Dict) -> Dict[str, Any]:
        conditions = {
            "usia": raw_intake.get("usia", 0),
            "sedang_hamil": raw_intake.get("sedang_hamil", False),
            "tipe_diabetes": raw_intake.get("tipe_diabetes"),
            "alergi": raw_intake.get("alergi", ""),
            "bmi": summary.get("patient_info", {}).get("bmi"),
            "obat_saat_ini": raw_intake.get("obat_saat_ini", []),
            "riwayat_penyakit_lain": raw_intake.get("riwayat_penyakit_lain", []),
        }

        riwayat = [r.lower() for r in raw_intake.get("riwayat_penyakit_lain", [])]
        
        if any("ginjal" in r for r in riwayat):
            conditions["gangguan_ginjal"] = True
        if any("jantung" in r or "kardiovaskular" in r for r in riwayat):
            conditions["penyakit_kardiovaskular"] = True
        if any("hipertensi" in r for r in riwayat):
            conditions["hipertensi"] = True

        return conditions

    def _plan_candidate_medications(self, raw_intake: Dict, summary: Dict) -> List[str]:
        candidates = []
        
        tipe_dm = raw_intake.get("tipe_diabetes", "")
        sudah_terdiagnosis = raw_intake.get("sudah_terdiagnosis", False)
        sedang_hamil = raw_intake.get("sedang_hamil", False)
        obat_saat_ini = raw_intake.get("obat_saat_ini", [])
        bmi = summary.get("patient_info", {}).get("bmi")
        usia = raw_intake.get("usia", 0)
        riwayat = [r.lower() for r in raw_intake.get("riwayat_penyakit_lain", [])]

        if tipe_dm == "tipe1":
            candidates.append("Insulin Basal (Glargine)")
            return candidates

        if sedang_hamil:
            candidates.append("Insulin Basal (Glargine)")
            candidates.append("Insulin Rapid-acting (Lispro)")
            return candidates

        if not sudah_terdiagnosis:
            return []

        if "metformin" not in [o.lower() for o in obat_saat_ini]:
            candidates.append("Metformin 500mg")
        
        gds = raw_intake.get("gula_darah_terakhir", 0)
        
        if gds and gds > 200:
            if usia >= 65:
                candidates.append("DPP-4 Inhibitor (Sitagliptin)")
            elif any("jantung" in r for r in riwayat):
                candidates.append("SGLT2 Inhibitor (Empagliflozin)")
            elif any("ginjal" in r for r in riwayat):
                candidates.append("DPP-4 Inhibitor (Linagliptin)")
            else:
                candidates.append("DPP-4 Inhibitor (Sitagliptin)")
                candidates.append("Sulfonilurea (Glimepiride)")

        if gds and gds > 300:
            candidates.append("Insulin Basal (Glargine)")

        return candidates if candidates else ["Metformin 500mg"]

    def _search_drug_knowledge(self, candidates: List[str], contraindication: Dict) -> str:
        search_terms = []
        
        for med in candidates:
            med_lower = med.lower()
            if "metformin" in med_lower:
                search_terms.append("metformin dosis kontraindikasi")
            elif "sulfonilurea" in med_lower or "glimepiride" in med_lower:
                search_terms.append("sulfonilurea glimepiride dosis efek samping")
            elif "dpp" in med_lower or "sitagliptin" in med_lower:
                search_terms.append("dpp-4 inhibitor sitagliptin dosis")
            elif "sglt" in med_lower or "empagliflozin" in med_lower:
                search_terms.append("sglt2 inhibitor empagliflozin dosis")
            elif "insulin" in med_lower:
                search_terms.append("insulin jenis dosis basal bolus")

        search_terms.append("pedoman penatalaksanaan diabetes perkeni algoritma terapi")

        combined_query = " ".join(search_terms[:6])
        
        try:
            return self.rag_service.search(combined_query, top_k=5)
        except Exception as e:
            print(f"[WARNING] RAG search failed: {e}")
            return "Knowledge base tidak tersedia."

    def _call_llm(
        self,
        clinical_summary: Dict,
        contraindication: Dict,
        drug_context: str
    ) -> Dict[str, Any]:
        prompt = f"""CLINICAL SUMMARY (dari Clinical Summarizer Agent):
{json.dumps(clinical_summary, ensure_ascii=False, indent=2)}

HASIL CONTRAINDICATION CHECK (dari Contraindication Checker Tool):
{json.dumps(contraindication, ensure_ascii=False, indent=2)}

DRUG KNOWLEDGE BASE (dari RAG):
{drug_context}

TUGAS: Susun draf regimen terapi diabetes berdasarkan data di atas.
PATUHI hasil contraindication check - JANGAN meresepkan obat yang contraindicated.
Berikan rationale untuk setiap obat.
Output WAJIB JSON sesuai format yang ditentukan."""

        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]

        try:
            print(f"  [LLM] Calling Groq API...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2500
            )

            content = response.choices[0].message.content
            print(f"  [LLM] Response received: {len(content)} chars")

            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            result = json.loads(content)
            print(f"  [LLM] JSON parsed successfully")
            return result

        except json.JSONDecodeError as e:
            print(f"  [LLM ERROR] JSON Parse Error: {e}")
            print(f"  [LLM ERROR] Raw content: {content[:300] if 'content' in locals() else 'N/A'}")
            return self._fallback_prescription()
        except Exception as e:
            print(f"  [LLM ERROR] LLM call failed: {e}")
            return self._fallback_prescription()

    def _fallback_prescription(self) -> Dict[str, Any]:
        return {
            "diagnosis": "Diabetes Melitus (perlu evaluasi lebih lanjut)",
            "treatment_goals": ["Kontrol gula darah", "Pencegahan komplikasi"],
            "medications": [],
            "non_pharmacological": [
                "Diet diabetes",
                "Olahraga teratur",
                "Monitoring gula darah"
            ],
            "referrals": ["Dokter / Endokrinolog"],
            "follow_up_schedule": "1-2 minggu",
            "doctor_validation_notes": "AI gagal menyusun draf resep. Perlu penilaian manual oleh dokter."
        }