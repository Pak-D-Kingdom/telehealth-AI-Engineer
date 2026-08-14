# Telehealth AI (Diabetes Care Focus)

## Teknologi

- Python `3.10+`
- FastAPI `0.110+`
- Uvicorn `0.28+`
- Groq API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`) dengan strategi **Round-Robin Fallback**
- SentenceTransformers (`all-MiniLM-L6-v2` - Gratis/Lokal untuk Vector Search)
- Supabase `pgvector` (Vector Database)
- Pydantic & Pydantic Settings `2.6+`
- Docker & Docker Compose

---

## Prasyarat

Pastikan Python (atau Docker) telah terinstall di sistem Anda:

```bash
python --version
# atau jika menggunakan Docker:
docker --version
docker compose version
```

---

## Instalasi & Cara Menjalankan

### Cara 1: Menggunakan Docker Compose

1. Masuk ke direktori proyek:
   ```bash
   cd telehealth-AI-Engineer
   ```

2. Salin file konfigurasi environment:
   ```bash
   cp .env.example .env
   ```

3. Jalankan service menggunakan Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Cek log container untuk memastikan service berjalan lancar:
   ```bash
   docker compose logs -f telehealth-ai
   ```

Service AI siap diakses pada **`http://localhost:8000`**.

---

### Cara 2: Menjalankan Secara Lokal (Tanpa Docker - Python Virtual Environment)

1. **Masuk ke direktori proyek:**
   ```bash
   cd telehealth-AI-Engineer
   ```

2. **Buat dan aktifkan Python Virtual Environment:**
   * **Windows (PowerShell / Command Prompt):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate
     ```
   * **Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install seluruh dependensi proyek:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Salin & sesuaikan file environment:**
   ```bash
   cp .env.example .env
   ```
   *(Buka file `.env` dan isi `GROQ_API_KEY`, `SUPABASE_URL`, dan `SUPABASE_KEY`)*

5. **Jalankan server FastAPI secara lokal:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

Service AI siap diakses secara lokal pada **`http://localhost:8000`** (Swagger UI di `http://localhost:8000/docs`).

---

## Konfigurasi Environment

| Nama Variable | Nilai Default | Keterangan |
| --- | --- | --- |
| `PORT` | `8000` | Port tempat FastAPI berjalan |
| `NODE_ENV` | `development` | Mode lingkungan (`development` / `production`) |
| `X_AI_API_KEY` | `telehealth_ai_secret_key_dev` | Secret Key untuk autentikasi internal dari Backend Bun |
| `GROQ_API_KEY` | `gsk_...` | API Key Groq untuk komputasi cepat LLM & Fallback |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Model Local Embedding Gratis (SentenceTransformers) |
| `SUPABASE_URL` | `http://127.0.0.1:54321` | URL Supabase Lokal (Supabase CLI default) |
| `SUPABASE_KEY` | `ey...` | Anon Key Supabase Lokal untuk akses `pgvector` |

---

## Setup Database Supabase / pgvector Lokal

1. **Jalankan Supabase Lokal:**
   ```bash
   supabase start
   ```
2. **Jalankan Schema Database:**
   Buka **Supabase Studio** di `http://127.0.0.1:54323` $\rightarrow$ **SQL Editor**, atau jalankan file `db/schema.sql` untuk secara otomatis membuat tabel `documents` (dengan `VECTOR(384)`) dan fungsi RPC `match_documents`.

---

## Struktur Folder Proyek

```text
telehealth-AI-Engineer/
├── .env                              # Environment variables lokal
├── .env.example                      # Template environment variables
├── .gitignore                        # Git ignore file
├── compose.yaml                      # Docker Compose orkestrasi port 8000
├── Dockerfile                        # Multi-stage Dockerfile Python 3.10-slim
├── main.py                           # Application entry point & FastAPI instance
├── PRD.md                            # Dokumen Spesifikasi Arsitektur & Fitur
├── README.md                         # Dokumentasi proyek (File Ini)
├── requirements.txt                  # Dependensi Python
│
├── db/                               # 📁 DOKUMEN MIGRASI DATABASE
│   └── schema.sql                    # Schema SQL Database pgvector lokal
│
└── app/                              # 📁 FOLDER UTAMA APLIKASI
    ├── __init__.py
    ├── config.py                     # Centralized config via Pydantic Settings
    │
    ├── agents/                       # 🤖 MULTI-AGENT LOGIC
    │   ├── __init__.py
    │   ├── ads_agent.py              # Placeholder Agent Ads / Marketing (Fase 2)
    │   ├── customer_agent.py         # Diabetes Patient Care Agent (RAG + Guardrail)
    │   └── finance_agent.py          # Placeholder Agent Keuangan (Fase 2)
    │
    ├── core/                         # 🛡️ SHARED CORE UTILITIES
    │   ├── __init__.py
    │   ├── embeddings.py             # Service khusus generator Vector Embedding
    │   ├── guardrail.py              # Filter keselamatan medis & penambahan disclaimer otomatis
    │   └── llm.py                    # Unified Interface Groq API + Round-Robin Fallback
    │
    ├── knowledge_base/               # 📁 DOKUMEN KNOWLEDGE BASE DIABETES (.md)
    │
    ├── routers/                      # 🌐 REST API ENDPOINTS & PYDANTIC DTOs
    │   ├── __init__.py
    │   ├── ads_router.py             # Endpoint POST /api/v1/ads/analyze (Fase 2)
    │   ├── customer_router.py        # Endpoint POST /api/v1/customer/chat
    │   └── finance_router.py         # Endpoint POST /api/v1/finance/analyze (Fase 2)
    │
    └── services/                     # ⚙️ RAG & VECTOR STORAGE (SUPABASE)
        ├── __init__.py
        ├── ingest_service.py         # Skrip pengunggah file .md di app/knowledge_base/ ke Supabase
        └── vector_store.py           # Inisialisasi Supabase Client & Similarity Search pgvector
```

---

## Endpoint API

Dokumentasi interaktif OpenAPI (Swagger UI) dapat diakses langsung pada browser di:  
👉 **`http://localhost:8000/docs`**

### Daftar Endpoint:

| Method | Endpoint | Access | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Status kesehatan service AI dan provider |
| `POST` | `/api/v1/customer/chat` | Internal API Key | Endpoint konsultasi & pendampingan penderita Diabetes |
| `POST` | `/api/v1/ingest` | Admin / Dev | Trigger manual untuk ingest file `.md` di `app/knowledge_base/` ke Supabase `pgvector` |

---

## Modul Ingest Knowledge Base (RAG)

Untuk mengunggah atau meng-update dokumen `.md` dari folder `app/knowledge_base/` ke database Supabase `pgvector`, jalankan endpoint ingest berikut:

```bash
curl -X POST http://localhost:8000/api/v1/ingest
```
