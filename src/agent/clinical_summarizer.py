import json
from typing import Dict, Any, List
from groq import Groq
from src.config import get_settings
from src.agent.triage_engine import TriageEngine
from src.agent.intake_parser import IntakeParser
from src.rag_service import RAGService
from src.rag_service import get_rag_service

class ClinicalSummarizer:
    """
    AI Agent yang menyusun ringkasan klinis format SOAP.
    
    Agent ini:
    1. Menerima data intake mentah
    2. Memanggil TriageEngine sebagai tool
    3. Memanggil Knowledge Base (RAG) sebagai tool
    4. Menggunakan LLM untuk reasoning & menyusun SOAP
    5. Output: ringkasan terstruktur untuk dokter
    """

    SYSTEM_PROMPT = """Kamu adalah AI Clinical Assistant untuk dokter spesialis penyakit dalam/endokrinologi.

TUGASMU:
Menyusun ringkasan klinis format SOAP (Subjective, Objective, Assessment, Plan) berdasarkan data intake pasien dan hasil triage.

ATURAN:
1. Gunakan data yang diberikan, JANGAN mengarang informasi yang tidak ada di data.
2. Untuk bagian Assessment, berikan analisis klinis berdasarkan guidelines medis.
3. Untuk bagian Plan, berikan rekomendasi yang actionable.
4. Jika ada red flag, prioritaskan penanganan darurat.
5. Gunakan bahasa medis yang tepat tapi tetap ringkas.
6. Format output WAJIB JSON.

FORMAT OUTPUT (JSON):
{
  "soap": {
    "subjective": "Keluhan dan riwayat pasien (narasi)",
    "objective": "Data terukur: BMI, gula darah, TD, dll",
    "assessment": "Analisis klinis + diagnosis working",
    "plan": "Rekomendasi tindakan + terapi"
  },
  "clinical_notes": "Catatan penting untuk dokter",
  "urgency": "routine | urgent | emergency",
  "referral_needed": ["list spesialis jika perlu rujukan"],
  "follow_up_schedule": "Saran jadwal kontrol"
}"""

    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan!")
        
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama-3.1-8b-instant"
        
        # Tools yang dimiliki agent
        self.triage_engine = TriageEngine()
        self.intake_parser = IntakeParser()
        self.rag_service = get_rag_service()

    def generate_summary(self, raw_intake: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main agent loop: proses intake → panggil tools → generate SOAP.
        """
        # STEP 1: Parse intake form
        parsed_intake = self.intake_parser.parse(raw_intake)
        
        # STEP 2: Call tool - Triage Engine
        triage_result = self.triage_engine.process(raw_intake)
        
        # STEP 3: Call tool - Knowledge Base (RAG)
        # Cari info relevan dari knowledge base berdasarkan kondisi pasien
        search_query = self._build_rag_query(parsed_intake, triage_result)
        rag_context = self.rag_service.search(search_query, top_k=3)
        
        # STEP 4: Build prompt untuk LLM
        agent_prompt = self._build_agent_prompt(
            parsed_intake, 
            triage_result, 
            rag_context
        )
        
        # STEP 5: LLM reasoning & generate SOAP
        soap_output = self._call_llm(agent_prompt)
        
        # STEP 6: Gabungkan hasil
        final_output = {
            "patient_info": triage_result["patient_info"],
            "diabetes_info": triage_result["diabetes_info"],
            "triage_result": triage_result["triage_result"],
            "clinical_summary": soap_output,
            "recommended_action": triage_result["recommended_action"],
            "proceed_to_doctor": triage_result["proceed_to_doctor"],
            "rag_context_used": rag_context[:200] + "..." if len(rag_context) > 200 else rag_context
        }
        
        return final_output

    def _build_rag_query(self, intake: Dict, triage: Dict) -> str:
        """
        Agent memutuskan query apa yang perlu dicari di knowledge base.
        Ini adalah bentuk "planning" dari agent.
        """
        query_parts = []
        
        # Jika ada gejala spesifik, cari info tentang itu
        if intake.get("gejala"):
            query_parts.append(" ".join(intake["gejala"][:3]))
        
        # Jika ada warning retinopati, cari info komplikasi mata
        warnings = triage.get("triage_result", {}).get("warnings", [])
        for w in warnings:
            if w.get("type") == "retinopati_awal":
                query_parts.append("komplikasi mata diabetes retinopati")
            elif w.get("type") == "neuropati":
                query_parts.append("neuropati diabetik perawatan")
        
        # Jika ada red flag, cari info penanganan darurat
        red_flags = triage.get("triage_result", {}).get("red_flags", [])
        for rf in red_flags:
            rf_type = rf.get("type", "")
            if rf_type == "hipoglikemia":
                query_parts.append("hipoglikemia penanganan darurat")
            elif rf_type == "ketoasidosis":
                query_parts.append("ketoasidosis diabetik")
        
        # Default query jika kosong
        if not query_parts:
            if intake.get("sudah_terdiagnosis"):
                query_parts.append("penatalaksanaan diabetes melitus")
            else:
                query_parts.append("diagnosis diabetes melitus")
        
        return " ".join(query_parts[:5])

    def _build_agent_prompt(self, intake: Dict, triage: Dict, rag_context: str) -> str:
        """
        Susun prompt lengkap untuk LLM dengan semua konteks dari tools.
        """
        return f"""DATA PASIEN (dari Intake Form):
{json.dumps(intake, ensure_ascii=False, indent=2)}

HASIL TRIAGE (dari Triage Engine tool):
{json.dumps(triage, ensure_ascii=False, indent=2)}

REFERENSI MEDIS (dari Knowledge Base tool):
{rag_context}

TUGAS: Susun ringkasan klinis format SOAP berdasarkan data di atas.
Gunakan referensi medis jika relevan. Jika ada red flag, prioritaskan penanganan darurat.
Output WAJIB JSON sesuai format yang ditentukan."""

    def _call_llm(self, prompt: str) -> Dict[str, Any]:
        """Panggil LLM untuk reasoning dan generate SOAP."""
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # Clean up markdown wrapper jika ada
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Raw content: {content[:300]}")
            return self._fallback_summary()
        except Exception as e:
            print(f"Error LLM: {e}")
            return self._fallback_summary()

    def _fallback_summary(self) -> Dict[str, Any]:
        """Fallback jika LLM gagal."""
        return {
            "soap": {
                "subjective": "Data intake tersedia, namun summarisasi gagal.",
                "objective": "Lihat data triage untuk detail.",
                "assessment": "Perlu review manual oleh dokter.",
                "plan": "Evaluasi ulang oleh dokter."
            },
            "clinical_notes": "AI summarization failed - manual review required",
            "urgency": "routine",
            "referral_needed": [],
            "follow_up_schedule": "Sesuai kebijakan dokter"
        }