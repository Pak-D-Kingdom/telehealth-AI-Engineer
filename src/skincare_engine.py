def recommend_baseline_routine(profile: dict) -> dict:
    skin_type = profile.get("skin_type") or "unknown"
    concerns = profile.get("concerns") or []

    routine = {
        "morning": ["cleanser", "moisturizer", "sunscreen"],
        "night": ["cleanser", "moisturizer"],
        "notes": [
            "Tambahkan produk baru satu per satu.",
            "Lakukan patch test sebelum pemakaian rutin.",
        ],
    }

    if "dull_skin" in concerns or "acne_marks" in concerns:
        routine["night"].insert(1, "brightening serum, mulai 2-3 kali seminggu")

    if skin_type == "sensitive":
        routine["notes"].append("Untuk kulit sensitif, mulai dari routine minimalis terlebih dahulu.")

    return routine


def check_ingredient_compatibility(current_products: list[str], new_product: str) -> dict:
    products = " ".join(current_products + [new_product]).lower()
    warnings = []

    if "retinol" in products and ("aha" in products or "bha" in products or "exfol" in products):
        warnings.append("Retinol dan exfoliant sebaiknya tidak dipakai bersamaan oleh pemula.")

    return {
        "is_compatible": not warnings,
        "warnings": warnings,
    }

