# PRD (Product Requirement Document) - Telehealth AI Microservice (Diabetes Care Focus)

**Project Name:** `telehealth-ai`  
**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, Pydantic, Groq API (Multi-Model Round-Robin), Supabase (pgvector), Docker, Docker Compose  
**LLM & Embedding Providers:** Groq API (Primary: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it` with automatic Rate-Limit Fallback) & SentenceTransformers (Free Local Embedding: `all-MiniLM-L6-v2`)  
**Primary Domain Focus:** Diabetes Care & Lifestyle Management Platform (GlucoCare)  
**Integration Target:** `telehealth-backend` (Bun/Express) & `telehealth-frontend` (Next.js)  

---

## 1. Executive Summary & Vision

`telehealth-ai` adalah microservice khusus berbasis Python dan FastAPI yang berfungsi sebagai **Pusat Kecerdasan Buatan (AI Microservice)** untuk platform Telehealth penderita Diabetes. Service ini diarsitekturkan secara modular menggunakan sistem **Multi-Agent**, komputasi cepat **Groq API** dengan mekanisme **Round-Robin / Model Fallback**, serta **RAG (Retrieval-Augmented Generation)** berbasis **Supabase `pgvector`**.

### Roadmap Pengembangan:
* **Fase 1 (Fokus Utama Saat Ini):** **Diabetes Patient Care Assistant (RAG System)**  
  Melayani dan mendampingi penderita diabetes mengenai pemantauan gula darah, edukasi makanan/gaya hidup sehat rendah indeks glikemik, pertolongan awal gejala hipoglikemia/hiperglikemia, panduan penggunaan alat medis (glucometer/strip), serta informasi produk kesehatan diabetes.
* **Fase 2 (Ekspansi Masa Depan):** **AI Financial & Ads Analysis Agents**  
  * **Finance Agent:** Menganalisis laporan keuangan, statistik transaksi, dan tren pendapatan platform.
  * **Ads Agent:** Menganalisis efektivitas kampanye iklan (ROI, CPA, CTR) dan memberikan saran optimasi pemasaran.

---

## 2. Architecture & Design Patterns

### System Integration Architecture (Frontend - Backend - AI Microservice)

```text
┌─────────────────────────┐        HTTP / REST        ┌─────────────────────────┐        Internal REST        ┌─────────────────────────┐
│   telehealth-frontend   │ ────────────────────────> │   telehealth-backend    │ ────────────────────────> │      telehealth-ai      │
│        (Next.js)        │  User Auth & Chat Input   │      (Bun / Express)    │  Header: X-AI-API-KEY   │   (FastAPI Microservice)│
└─────────────────────────┘                           └─────────────────────────┘                             └────────────┬────────────┘
                                                                                                                           │
                                                                                                     ┌─────────────────────┴─────────────────────┐
                                                                                                     │                                           │
                                                                                                     ▼                                           ▼
                                                                                        ┌─────────────────────────┐                 ┌─────────────────────────┐
                                                                                        │    Supabase pgvector    │                 │      Groq LLM API       │
                                                                                        │    (Knowledge Base)     │                 │   (Round-Robin Models)   │
                                                                                        └─────────────────────────┘                 └─────────────────────────┘
```

**Penjelasan Alur Integrasi:**
1. **Frontend (`telehealth-frontend` - Next.js):** Pengguna (pasien diabetes) mengirim pesan atau pertanyaan konsultasi melalui antarmuka chat.
2. **Backend API Gateway (`telehealth-backend` - Bun/Express):** Mengatur autentikasi user, manajemen sesi, serta meneruskan payload request ke `telehealth-ai` menggunakan header autentikasi internal `X-AI-API-KEY`.
3. **AI Microservice (`telehealth-ai` - FastAPI):** 
   - Menerima request di endpoint `/api/v1/customer/chat`.
   - Mengambil dokumen rujukan medis terkait dari **Supabase `pgvector`** (RAG).
   - Mengirim konteks + prompt ke **Groq API** (menggunakan alur Fallback Multi-Model).
   - Memasukkan *Medical Disclaimer* & menyaring jawaban lewat **Guardrail** sebelum mengembalikan respon ke Backend.

---

## 3. Directory & File Structure (Final & Clean)

```text
telehealth-ai/
├── .env                              # Environment variables (GROQ_API_KEY, Supabase Credentials, Port)
├── .env.example                      # Template environment variables untuk repository
├── .gitignore                        # Git ignore file
├── Dockerfile                        # Multi-stage Dockerfile untuk Python 3.10
├── compose.yaml                      # Docker Compose untuk orkestrasi container AI
├── requirements.txt                  # Python dependencies (fastapi, uvicorn, openai, supabase, pydantic, dll)
├── main.py                           # Application entry point & FastAPI server instance
├── PRD.md                            # Document Spesifikasi & Architecture (File Ini)
├── README.md                         # Panduan cara menjalankan project & API docs singkat
│
├── db/                               # 📁 DOKUMEN MIGRASI DATABASE
│   └── schema.sql                    # Schema SQL Database pgvector (Tabel documents & RPC function)
│
└── app/                              # 📁 FOLDER UTAMA APLIKASI
    ├── __init__.py
    ├── config.py                     # Centralized environment configuration (Pydantic Settings & Groq Models)
    │
    ├── knowledge_base/               # 📁 DOKUMEN PENGETAHUAN DIABETES (.md)
    │   ├── device_manuals.md         # Panduan cara pakai alat glucometer, strip, & lancet
    │   ├── diabetes_faq.md           # FAQ seputar gejala, gula darah, & pertolongan pertama
    │   └── nutrition_guide.md        # Panduan makanan indeks glikemik rendah (Low GI)
    │
    ├── core/                         # 🛡️ SHARED CORE UTILITIES
    │   ├── __init__.py
    │   ├── llm.py                    # Unified Groq API Interface dengan Round-Robin Model Fallback
    │   ├── embeddings.py             # Vector Embeddings Generator (SentenceTransformers all-MiniLM-L6-v2)
    │   └── guardrail.py              # Safety Guardrails (Diabetes Medical disclaimer & filter)
    │
    ├── services/                     # ⚙️ RAG & VECTOR STORAGE (SUPABASE)
    │   ├── __init__.py
    │   ├── vector_store.py           # Inisialisasi Supabase Client + Similarity Search (Fallback ke app/knowledge_base/)
    │   └── ingest_service.py         # Membaca file .md dari app/knowledge_base/ & upload embeddings ke Supabase
    │
    ├── agents/                       # 🤖 MULTI-AGENT LOGIC
    │   ├── __init__.py
    │   ├── customer_agent.py         # [Fase 1] Diabetes Care Agent (Memanggil RAG + Groq LLM + guardrail)
    │   ├── finance_agent.py          # [Fase 2] Financial Analysis Agent (Placeholder)
    │   └── ads_agent.py              # [Fase 2] Ads & Marketing Analysis Agent (Placeholder)
    │
    └── routers/                      # 🌐 REST API ENDPOINTS & PYDANTIC DTOs
        ├── __init__.py
        ├── customer_router.py        # POST /api/v1/customer/chat (Chat Endpoint + Pydantic Models)
        ├── finance_router.py         # POST /api/v1/finance/analyze (Fase 2)
        └── ads_router.py             # POST /api/v1/ads/analyze (Fase 2)
```

---

## 4. Penjelasan File Utama di Root & App

1. **`main.py`**: Entry point utama FastAPI, CORS middleware, router registration, dan `/health` check.
2. **`app/knowledge_base/`**: Berada di dalam folder `app/`, tempat penyimpanan file-file `.md` rujukan medis diabetes.
3. **`app/core/llm.py`**: Menggunakan **Groq API** dengan pengalihan otomatis (*Round-Robin Fallback*) jika satu model mencapai batas kuota (Rate Limit).
4. **`app/services/vector_store.py`**: Menangani pencarian dokumen medis di Supabase `pgvector` (dengan fallback pembacaan file di `app/knowledge_base/`).
