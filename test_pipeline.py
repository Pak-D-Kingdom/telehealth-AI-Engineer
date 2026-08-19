import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.config import get_settings
from src.rag_service import RAGService
from src.llm_service import LLMService
from src.prompt_templates import SYSTEM_PROMPT

def run_test():
    print("=" * 50)
    print("MEMULAI PENGUJIAN PIPELINE DIABETES AI")
    print("=" * 50)

    settings = get_settings()
    print(f"[1/4] Konfigurasi .env berhasil dimuat.")
    print(f"      - EMBEDDING_PROVIDER: {settings.embedding_provider}")
    print(f"      - LLM_MODEL: {settings.llm_model}")
    
    if not settings.openrouter_api_key:
        print("ERROR: OPENROUTER_API_KEY kosong!")
        return

    print("\n[2/4] Menginisialisasi RAG Service...")
    try:
        rag = RAGService()
        print("      - RAG Service siap.")
    except Exception as e:
        print(f"ERROR pada RAG: {e}")
        return

    test_query = "Saya sering kencing dan haus terus, berat badan turun 8kg sebulan"
    print(f"\n[3/4] Melakukan Retrieval untuk query: '{test_query}'")
    
    context = rag.search(test_query, top_k=2)
    print("      - Konteks berhasil diambil:")
    print("-" * 30)
    print(context[:300] + "..." if len(context) > 300 else context)
    print("-" * 30)

    print("\n[4/4] Memanggil OpenRouter LLM...")
    llm = LLMService()
    
    try:
        result = llm.generate(user_message=test_query, context=context)
        print("      - Respon LLM berhasil diterima.")
        print("\nHASIL AKHIR (JSON):")
        print(json.dumps(result, indent=4, ensure_ascii=False))
        print("=" * 50)
        print("TESTING BERHASIL!")
    except Exception as e:
        print(f"ERROR pada LLM: {e}")

if __name__ == "__main__":
    run_test()