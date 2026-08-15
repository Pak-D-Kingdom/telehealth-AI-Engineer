import os
import json
import re
from typing import Dict, Any, List
from groq import Groq
from src.config import get_settings


class FoodAnalyzer:
    def __init__(self):
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan di file .env!")

        self.client = Groq(
            api_key=settings.groq_api_key,
            timeout=120.0,
            max_retries=2
        )

        self.models = [
            os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.6-27b"),
            "qwen/qwen3-vl-30b-a3b-instruct",
        ]
        self.models = list(dict.fromkeys(self.models))

        self.text_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    SYSTEM_PROMPT = """/no_think

Kamu adalah ahli gizi diabetes Indonesia. Analisis foto makanan dan estimasi komposisinya.

PENTING: JANGAN tulis proses berpikir, JANGAN jelaskan, JANGAN beri pengantar.
LANGSUNG keluarkan JSON sebagai output pertama dan satu-satunya.

WAJIB:
1. Identifikasi SEMUA item makanan yang terlihat.
2. Untuk SETIAP item, WAJIB isi: estimated_weight_grams, carbs_grams, protein_grams, calories.
3. JANGAN isi angka 0. Perkirakan berdasarkan porsi yang kamu lihat dan pengetahuanmu.
4. Balas HANYA JSON, tanpa teks lain, tanpa markdown.

CONTOH OUTPUT (foto semangkuk bakso dengan mi):
{
  "detected_items": [
    {"name": "Bakso Sapi", "category": "protein", "portion": "sedang", "estimated_weight_grams": 120, "carbs_grams": 12, "protein_grams": 14, "calories": 180},
    {"name": "Mi Kuning", "category": "karbohidrat", "portion": "sedang", "estimated_weight_grams": 100, "carbs_grams": 25, "protein_grams": 5, "calories": 140},
    {"name": "Sayur Sawi", "category": "sayur", "portion": "sedikit", "estimated_weight_grams": 40, "carbs_grams": 1, "protein_grams": 1, "calories": 10}
  ],
  "glycemic_impact": "sedang",
  "balance_score": 5,
  "balance_assessment": "Kombinasi protein dan karbohidrat dengan sedikit serat.",
  "advice": "Kurangi porsi mi setengah dan tambah sayuran hijau.",
  "is_diabetes_friendly": false,
  "suggested_questions": ["Apakah ada mi pendamping?", "Berapa porsi yang aman?"]
}

ATURAN FIELD:
- detected_items: array, minimal 1
- category: "karbohidrat" | "protein" | "sayur" | "lemak"
- portion: "sedikit" | "sedang" | "banyak"
- estimated_weight_grams / carbs_grams / protein_grams / calories: integer > 0
- glycemic_impact: "rendah" | "sedang" | "tinggi"
- balance_score: integer 1-10
- is_diabetes_friendly: boolean
- suggested_questions: array 2-3 string

MULAI LANGSUNG DENGAN { TANPA TEKS APAPUN."""

    COMPARE_PROMPT = """/no_think

Kamu adalah ahli gizi diabetes. Berikut hasil analisis beberapa foto makanan (JSON).
Bandingkan dan tentukan mana yang LEBIH BAIK untuk penderita diabetes.
JANGAN tulis proses berpikir. LANGSUNG JSON.

DATA ANALISIS:
{data}

BALAS HANYA JSON dengan format:
{{
  "better_choice": "label pilihan terbaik (misal 'Gambar 1')",
  "comparison_text": "perbandingan singkat 2-3 kalimat",
  "recommendation": "rekomendasi praktis 1-2 kalimat",
  "suggested_questions": ["q1", "q2"]
}}"""

    def analyze(self, image_base64: str, user_note: str = "") -> Dict[str, Any]:
        image_base64 = self._normalize_base64(image_base64)

        user_prompt = (
            "Analisis foto makanan ini. "
            "Isi estimated_weight_grams, carbs_grams, protein_grams, calories untuk setiap item. "
            "LANGSUNG JSON, tanpa penjelasan."
        )
        if user_note:
            user_prompt += f" Catatan: {user_note}"

        last_error = None
        for model in self.models:
            print(f"[FoodAnalyzer] Trying model: {model}")
            try:
                result = self._call_model(model, image_base64, user_prompt)
                if result and result.get("detected_items"):
                    print(f"[FoodAnalyzer] ✓ Success with model: {model}")
                    return result
            except Exception as e:
                last_error = e
                print(f"[FoodAnalyzer] ✗ Model {model} failed: {e}")
                continue

        print(f"[FoodAnalyzer] All models failed. Last error: {last_error}")
        return self._fallback()

    def compare_images(self, images: List[str], user_note: str = "") -> Dict[str, Any]:
        analyses = []
        for i, img in enumerate(images):
            a = self.analyze(img, user_note)
            a["label"] = f"Gambar {i+1}"
            analyses.append(a)

        comparison = None
        if len(analyses) > 1:
            comparison = self._compare(analyses)

        return {"analyses": analyses, "comparison": comparison}

    def _compare(self, analyses: List[Dict]) -> Dict[str, Any]:
        data = json.dumps(
            [
                {
                    "label": a.get("label"),
                    "detected_items": a.get("detected_items"),
                    "total_nutrition": a.get("total_nutrition"),
                    "glycemic_impact": a.get("glycemic_impact"),
                    "balance_score": a.get("balance_score"),
                    "is_diabetes_friendly": a.get("is_diabetes_friendly"),
                }
                for a in analyses
            ],
            ensure_ascii=False,
        )

        try:
            response = self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {"role": "system", "content": self.COMPARE_PROMPT.format(data=data)},
                ],
                temperature=0.3,
                max_tokens=800,
            )
            content = response.choices[0].message.content
            content = self._strip_think_tags(content)
            parsed = self._parse_json_robust(content)
            if parsed.get("better_choice"):
                return parsed
            return self._compare_fallback(analyses)
        except Exception as e:
            print(f"[FoodAnalyzer] Compare failed: {e}")
            return self._compare_fallback(analyses)

    def _compare_fallback(self, analyses: List[Dict]) -> Dict[str, Any]:
        valid = [a for a in analyses if a.get("detected_items")]
        if not valid:
            valid = analyses
        best = max(valid, key=lambda a: (a.get("balance_score") or 0))
        return {
            "better_choice": best.get("label", "Gambar 1"),
            "comparison_text": "Berdasarkan skor keseimbangan, pilihan ini lebih seimbang.",
            "recommendation": best.get("advice", "Pilih porsi yang lebih seimbang."),
            "suggested_questions": best.get("suggested_questions", []),
        }

    def _call_model(self, model: str, image_base64: str, user_prompt: str) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                    },
                ],
            },
        ]

        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
            max_tokens=4000,
        )

        content = response.choices[0].message.content
        content = self._strip_think_tags(content)

        result = self._parse_json_robust(content)
        result = self._compute_totals(result)
        return result

    def _compute_totals(self, result: Dict[str, Any]) -> Dict[str, Any]:
        items = result.get("detected_items", [])
        if not items:
            return result

        total_carbs = 0
        total_protein = 0
        total_calories = 0
        total_weight = 0

        for item in items:
            if not isinstance(item, dict):
                continue
            total_carbs += int(item.get("carbs_grams") or 0)
            total_protein += int(item.get("protein_grams") or 0)
            total_calories += int(item.get("calories") or 0)
            total_weight += int(item.get("estimated_weight_grams") or 0)

        result["total_nutrition"] = {
            "weight_grams": total_weight,
            "carbs_grams": total_carbs,
            "protein_grams": total_protein,
            "calories": total_calories,
        }

        if total_carbs > 0:
            margin = max(1, int(total_carbs * 0.15))
            result["estimated_carbs_grams"] = [
                max(0, total_carbs - margin),
                total_carbs + margin,
            ]

        return result

    def _strip_think_tags(self, content: str) -> str:
        if not content:
            return content
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", content, flags=re.IGNORECASE)
        cleaned = re.sub(r"<think>", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"</think>", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n\s*\n+", "\n", cleaned)
        return cleaned.strip()

    def _normalize_base64(self, image_base64: str) -> str:
        if "," in image_base64 and image_base64.startswith("data:"):
            return image_base64.split(",", 1)[1]
        return image_base64

    def _parse_json_robust(self, content: str) -> Dict[str, Any]:
        if not content or not content.strip():
            return self._fallback()

        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            pass

        cleaned = re.sub(r"```(?:json)?\s*", "", content)
        cleaned = re.sub(r"```", "", cleaned)
        try:
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            pass

        candidate = self._extract_balanced_json(content)
        if candidate:
            return candidate

        fallback = self._fallback()
        fallback["balance_assessment"] = content[:400].strip()
        return fallback

    def _extract_balanced_json(self, content: str) -> Dict[str, Any]:
        keys_hint = ['"detected_items"', '"balance_assessment"', '"glycemic_impact"']
        start = 0
        while True:
            idx = content.find("{", start)
            if idx == -1:
                return None
            block = self._read_balanced(content, idx)
            if block and any(k in block for k in keys_hint):
                parsed = self._try_parse(block)
                if parsed:
                    return parsed
            start = idx + 1

    def _read_balanced(self, content: str, start: int) -> str:
        depth = 0
        in_str = False
        escape = False
        for i in range(start, len(content)):
            ch = content[i]
            if in_str:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_str = False
            else:
                if ch == '"':
                    in_str = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        return content[start : i + 1]
        return None

    def _try_parse(self, block: str) -> Dict[str, Any]:
        try:
            parsed = json.loads(block)
            if isinstance(parsed, dict) and (
                "detected_items" in parsed or "balance_assessment" in parsed
            ):
                return parsed
        except json.JSONDecodeError:
            pass

        fixed = re.sub(r",\s*}", "}", block)
        fixed = re.sub(r",\s*]", "]", fixed)
        try:
            parsed = json.loads(fixed)
            if isinstance(parsed, dict) and (
                "detected_items" in parsed or "balance_assessment" in parsed
            ):
                return parsed
        except json.JSONDecodeError:
            pass

        return None

    def _fallback(self) -> Dict[str, Any]:
        return {
            "detected_items": [],
            "estimated_carbs_grams": [0, 0],
            "glycemic_impact": "tidak_diketahui",
            "balance_score": 0,
            "balance_assessment": "Maaf, saya tidak dapat menganalisis gambar ini saat ini.",
            "advice": "Coba unggah foto yang lebih jelas dengan pencahayaan baik.",
            "is_diabetes_friendly": False,
            "suggested_questions": [
                "Makanan apa yang aman untuk diabetes?",
                "Berapa porsi nasi yang disarankan?",
            ],
        }