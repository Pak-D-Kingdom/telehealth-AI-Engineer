RED_FLAG_KEYWORDS = [
    "bengkak",
    "sesak",
    "ruam menyebar",
    "luka terbuka",
    "bernanah",
    "nyeri hebat",
    "terbakar",
    "jerawat parah",
    "obat dokter",
    "hamil",
    "menyusui",
    "alergi berat",
]


def detect_red_flags(message: str) -> dict:
    normalized = message.lower()
    red_flags = [keyword for keyword in RED_FLAG_KEYWORDS if keyword in normalized]
    safety_status = "escalate" if red_flags else "safe"

    return {
        "safety_status": safety_status,
        "red_flags": red_flags,
        "recommended_action": "handoff" if red_flags else "answer",
    }

