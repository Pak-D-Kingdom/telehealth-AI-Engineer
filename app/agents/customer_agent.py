from app.core.llm import llm_service
from app.core.guardrail import medical_guardrail
from app.services.vector_store import vector_store_service

class DiabetesCustomerAgent:
    SYSTEM_PROMPT = """Anda adalah 'GlucoCare AI Assistant', asisten pintar dan ramah yang berdedikasi mendampingi penderita Diabetes dan keluarganya.

Tugas dan Aturan Utama Anda:
1. Memberikan edukasi yang jelas mengenai ambang batas kadar gula darah (puasa, sewaktu, HbA1c), nutrisi/pola makan rendah indeks glikemik (Low GI), dan pertolongan pertama gejala hipoglikemia/hiperglikemia.
2. Gunakan Konteks Pengetahuan Medis resmi di bawah ini sebagai rujukan utama jawaban Anda.
3. Gunakan bahasa Indonesia yang empati, sopan, dan mudah dipahami oleh orang awam.
4. DILARANG KERAS menyarankan pengubahan atau penyesuaian dosis obat resep (seperti Insulin, Metformin, Glimepiride). Arahkan pasien untuk berkonsultasi langsung dengan dokter spesialis jika ada pertanyaan soal dosis resep.

Konteks Pengetahuan Medis RAG:
{context}
"""

    async def handle_chat(self, message: str, chat_history: list[dict] = None) -> dict:
        # Step 1: Retrieve relevant medical context via RAG Vector Search
        relevant_docs = await vector_store_service.search_similar_documents(message)
        context_str = "\n\n".join(relevant_docs) if relevant_docs else "Tidak ada dokumen khusus, gunakan pedoman standar edukasi diabetes."

        # Step 2: System prompt with context
        system_prompt = self.SYSTEM_PROMPT.format(context=context_str)

        # Step 3: Generate response via LLM Service
        raw_reply = await llm_service.generate_response(
            system_prompt=system_prompt,
            user_message=message,
            chat_history=chat_history
        )

        # Step 4: Apply medical safety guardrail & disclaimer
        final_reply, disclaimer_added = medical_guardrail.apply_guardrail(raw_reply)

        # Step 5: Suggested action buttons
        suggested_actions = ["Panduan Gula Darah", "Makanan Low GI", "Alat Glucometer"]

        return {
            "reply": final_reply,
            "disclaimer_added": disclaimer_added,
            "suggested_actions": suggested_actions
        }

diabetes_customer_agent = DiabetesCustomerAgent()
