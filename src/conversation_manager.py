from uuid import uuid4


def create_session_id() -> str:
    return str(uuid4())


def append_message(history: list[dict], sender: str, message: str, max_history: int = 20) -> list[dict]:
    updated = history + [{"sender": sender, "message": message}]
    return updated[-max_history:]

