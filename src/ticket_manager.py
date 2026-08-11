from urllib.parse import quote

from src.config import get_settings


def build_ticket_summary(context: dict) -> str:
    return "\n".join(
        [
            f"Intent: {context.get('intent', '-')}",
            f"Concern: {context.get('concerns', '-')}",
            f"Red flags: {context.get('red_flags', '-')}",
            f"Order ID: {context.get('order_id', '-')}",
            f"Summary: {context.get('summary', '-')}",
        ]
    )


def generate_whatsapp_link(summary: str) -> str:
    phone = get_settings().whatsapp_admin_number
    message = quote(f"Halo Admin, saya butuh bantuan:\n{summary}")
    return f"https://wa.me/{phone}?text={message}"

