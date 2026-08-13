# Telehealth AI Microservice (Diabetes Care Focus)

AI Agent Microservice khusus penderita diabetes berbasis **Python 3.10**, **FastAPI**, **Groq API (Multi-Model Round-Robin Fallback)**, **Multi-Agent Architecture**, dan **RAG (Retrieval-Augmented Generation)** yang terintegrasi dengan **Supabase `pgvector`**.

Service ini dirancang untuk mendampingi penderita diabetes mengenai pemantauan kadar gula darah, pertolongan pertama hipoglikemia/hiperglikemia, manajemen nutrisi rendah indeks glikemik (Low GI), serta panduan penggunaan alat medis (glucometer & strip tes).

---

## Teknologi

- Python `3.10+`
- FastAPI `0.110+`
- Uvicorn `0.28+`
- Groq API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`) dengan strategi **Round-Robin Fallback**
- OpenAI API (`text-embedding-3-small` untuk Vector Search)
- Supabase `pgvector` (Vector Database)
- Pydantic & Pydantic Settings `2.6+`
- Docker & Docker Compose

---

## Strategi Multi-Model Groq (Round-Robin Fallback)

Untuk menjamin layanan AI selalu aktif tanpa hambatan kuota (*rate limit*), service ini menggunakan **Groq API** dengan hirarki pengalihan otomatis (*fallback*):

1. **`llama-3.3-70b-versatile`** (Model Utama - Kualitas Tertinggi)
2. **`llama-3.1-8b-instant`** (Fallback 1 - Kecepatan Tinggi)
3. **`mixtral-8x7b-32768`** (Fallback 2 - Konteks Panjang)
4. **`gemma2-9b-it`** (Fallback 3 - Cadangan)

*Jika model utama mencapai limit (HTTP 429 Rate Limit), sistem secara otomatis mengalihkan komputasi ke model berikutnya tanpa membuat pengguna merasa gagal.*

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

### Cara 1: Menggunakan Docker Compose (Sangat Direkomendasikan)

1. Masuk ke direktori proyek:
   ```bash
   cd telehealth-ai
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

## Konfigurasi Environment

| Nama Variable | Nilai Default | Keterangan |
| --- | --- | --- |
| `PORT` | `8000` | Port tempat FastAPI berjalan |
| `NODE_ENV` | `development` | Mode lingkungan (`development` / `production`) |
| `X_AI_API_KEY` | `telehealth_ai_secret_key_dev` | Secret Key untuk autentikasi internal dari Backend Bun |
| `GROQ_API_KEY` | `gsk_...` | API Key Groq untuk komputasi cepat LLM & Fallback |
| `OPENAI_API_KEY` | `sk-...` | API Key OpenAI untuk Vector Embeddings |
| `SUPABASE_URL` | `https://...supabase.co` | URL proyek Supabase |
| `SUPABASE_KEY` | `ey...` | API Key / Anon Key Supabase untuk akses `pgvector` |

---

## Struktur Folder Proyek

```text
telehealth-ai/
├── .env                              # Environment variables lokal
├── .env.example                      # Template environment variables
├── .gitignore                        # Git ignore file
├── Dockerfile                        # Multi-stage Dockerfile Python 3.10-slim
├── compose.yaml                      # Docker Compose orkestrasi port 8000
├── requirements.txt                  # Dependensi Python
├── main.py                           # Application entry point & FastAPI instance
├── PRD.md                            # Dokumen Spesifikasi Arsitektur & Fitur
├── README.md                         # Dokumentasi proyek (File Ini)
│
└── app/                              # 📁 FOLDER UTAMA APLIKASI
    ├── __init__.py
    ├── config.py                     # Centralized config via Pydantic Settings
    │
    ├── knowledge_base/               # 📁 DOKUMEN KNOWLEDGE BASE DIABETES (.md)
    │   ├── device_manuals.md         # Panduan cara pakai alat glucometer & strip tes
    │   ├── diabetes_faq.md           # Ambang batas gula darah & pertolongan hipoglikemia
    │   └── nutrition_guide.md        # Panduan pola makan indeks glikemik rendah (Low GI)
    │
    ├── core/                         # 🛡️ SHARED CORE UTILITIES
    │   ├── __init__.py
    │   ├── llm.py                    # Unified Interface Groq API + Round-Robin Fallback
    │   ├── embeddings.py             # Service khusus generator Vector Embedding
    │   └── guardrail.py              # Filter keselamatan medis & penambahan disclaimer otomatis
    │
    ├── services/                     # ⚙️ RAG & VECTOR STORAGE (SUPABASE)
    │   ├── __init__.py
    │   ├── vector_store.py           # Inisialisasi Supabase Client & Similarity Search pgvector
    │   └── ingest_service.py         # Skrip pengunggah file .md di app/knowledge_base/ ke Supabase
    │
    ├── agents/                       # 🤖 MULTI-AGENT LOGIC
    │   ├── __init__.py
    │   ├── customer_agent.py         # Diabetes Patient Care Agent (RAG + Guardrail)
    │   ├── finance_agent.py          # Placeholder Agent Keuangan (Fase 2)
    │   └── ads_agent.py              # Placeholder Agent Ads / Marketing (Fase 2)
    │
    └── routers/                      # 🌐 REST API ENDPOINTS & PYDANTIC DTOs
        ├── __init__.py
        ├── customer_router.py        # Endpoint POST /api/v1/customer/chat
        ├── finance_router.py         # Endpoint POST /api/v1/finance/analyze (Fase 2)
        └── ads_router.py             # Endpoint POST /api/v1/ads/analyze (Fase 2)
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
