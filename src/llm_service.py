from src.prompt_templates import SYSTEM_PROMPT


class LLMService:
    def __init__(self, model: str = "gemini-2.5-flash-lite"):
        self.model = model

    def build_messages(self, user_message: str, context: str = "") -> list[dict]:
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nUser:\n{user_message}"},
        ]

    def generate(self, user_message: str, context: str = "") -> dict:
        raise NotImplementedError("Integrate google-genai client in Notebook 02.")

