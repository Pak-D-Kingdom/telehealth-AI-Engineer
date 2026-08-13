from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError


class DiabetesIntakeForm(BaseModel):
    """
    Schema data intake form pasien diabetes.
    Di produksi, data ini datang dari frontend form.
    Untuk MVP, kita terima JSON langsung via API.
    """
    # Data pasien
    nama: str = Field(..., min_length=1, description="Nama lengkap pasien")
    usia: int = Field(..., ge=0, le=150, description="Usia pasien")
    jenis_kelamin: str = Field(..., description="laki-laki atau perempuan")
    berat_badan: Optional[float] = Field(None, ge=0, description="Berat badan (kg)")
    tinggi_badan: Optional[float] = Field(None, ge=0, description="Tinggi badan (cm)")
    tekanan_darah: Optional[str] = Field(None, description="Format: 120/80")

    # Data diabetes
    sudah_terdiagnosis: bool = Field(..., description="Apakah sudah didiagnosis dokter")
    tipe_diabetes: Optional[str] = Field(None, description="tipe1, tipe2, gestasional, tidak_tahu")
    gula_darah_terakhir: Optional[float] = Field(None, description="mg/dL")
    jenis_cek_gula: Optional[str] = Field(None, description="puasa, sewaktu, hba1c")
    hba1c: Optional[float] = Field(None, description="Persen, misal 6.5")

    # Gejala (list string)
    gejala: list[str] = Field(default_factory=list)

    # Riwayat
    obat_saat_ini: list[str] = Field(default_factory=list)
    riwayat_keluarga: Optional[str] = Field(None, description="tidak ada, ayah, ibu, kakek, nenek, saudara")
    alergi: Optional[str] = Field(None)
    sedang_hamil: Optional[bool] = Field(None)
    riwayat_penyakit_lain: list[str] = Field(default_factory=list)

    # Metadata
    program: str = Field(default="diabetes", description="Program yang dipilih pasien")


class IntakeParser:
    """
    Memvalidasi dan memproses data intake form.
    Menambahkan field turunan seperti BMI.
    """

    def parse(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse raw JSON menjadi struktur terstandarisasi.
        
        Args:
            raw_data: JSON mentah dari intake form
            
        Returns:
            Dict dengan data terstandarisasi + field turunan (BMI, dll)
            
        Raises:
            ValueError jika data tidak valid
        """
        try:
            # Validasi dengan Pydantic
            form = DiabetesIntakeForm(**raw_data)
            parsed = form.model_dump()

            # Tambahkan field turunan
            parsed["bmi"] = self._calculate_bmi(
                parsed.get("berat_badan"),
                parsed.get("tinggi_badan")
            )
            parsed["bmi_category"] = self._categorize_bmi(parsed["bmi"])
            parsed["usia_category"] = self._categorize_age(parsed["usia"])

            # Normalisasi gejala (lowercase, strip)
            parsed["gejala"] = [g.lower().strip() for g in parsed["gejala"]]

            # Normalisasi riwayat keluarga
            parsed["has_family_history"] = self._check_family_history(
                parsed.get("riwayat_keluarga")
            )

            return parsed

        except ValidationError as e:
            errors = []
            for err in e.errors():
                field = " -> ".join(str(loc) for loc in err["loc"])
                errors.append(f"{field}: {err['msg']}")
            raise ValueError("Data intake tidak valid: " + "; ".join(errors))

    def _calculate_bmi(self, weight: Optional[float], height: Optional[float]) -> Optional[float]:
        """Hitung BMI jika data lengkap."""
        if weight and height and height > 0:
            height_m = height / 100
            return round(weight / (height_m ** 2), 1)
        return None

    def _categorize_bmi(self, bmi: Optional[float]) -> str:
        """Kategorikan BMI berdasarkan standar WHO untuk Asia."""
        if bmi is None:
            return "tidak_diketahui"
        if bmi < 18.5:
            return "underweight"
        elif bmi < 23:
            return "normal"
        elif bmi < 25:
            return "overweight"
        elif bmi < 30:
            return "obese_1"
        else:
            return "obese_2"

    def _categorize_age(self, age: int) -> str:
        """Kategorikan usia untuk penilaian risiko."""
        if age < 30:
            return "muda"
        elif age < 45:
            return "dewasa_muda"
        elif age < 60:
            return "dewasa"
        else:
            return "lansia"

    def _check_family_history(self, riwayat: Optional[str]) -> bool:
        """Cek apakah ada riwayat keluarga."""
        if not riwayat:
            return False
        riwayat_lower = riwayat.lower()
        no_history_keywords = ["tidak", "tidak ada", "tidak ada riwayat", "none"]
        return not any(kw in riwayat_lower for kw in no_history_keywords)