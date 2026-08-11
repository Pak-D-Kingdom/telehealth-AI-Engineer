from pathlib import Path

import yaml


def load_markdown_documents(base_dir: str = "knowledge_base") -> list[dict]:
    documents = []
    for path in Path(base_dir).rglob("*.md"):
        content = path.read_text(encoding="utf-8")
        metadata = {}
        body = content

        if content.startswith("---"):
            _, frontmatter, body = content.split("---", 2)
            metadata = yaml.safe_load(frontmatter) or {}

        documents.append(
            {
                "path": str(path),
                "metadata": metadata,
                "content": body.strip(),
            }
        )
    return documents


def simple_keyword_retrieve(query: str, documents: list[dict], top_k: int = 5) -> list[dict]:
    terms = set(query.lower().split())
    scored = []
    for doc in documents:
        content = doc["content"].lower()
        score = sum(1 for term in terms if term in content)
        if score:
            scored.append((score, doc))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]

