class MedicalGuardrail:
    DISCLAIMER_TEXT = (
        "\n\n*Catatan Medis: Informasi ini bersifat edukasi dan pendampingan gaya hidup. "
        "Untuk perubahan dosis obat resep (seperti Insulin/Metformin) atau kondisi darurat, "
        "wajib berkonsultasi langsung dengan dokter spesialis Anda.*"
    )

    FORBIDDEN_KEYWORDS = [
        "ubah dosis", "ganti obat resep", "hentikan minum obat", "resepkan obat"
    ]

    def apply_guardrail(self, response_text: str) -> tuple[str, bool]:
        # Always attach the medical disclaimer for diabetes advice
        if not response_text.endswith(self.DISCLAIMER_TEXT):
            final_text = response_text + self.DISCLAIMER_TEXT
            return final_text, True
        return response_text, False

medical_guardrail = MedicalGuardrail()
