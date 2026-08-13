# AI Customer Service Chatbot Skincare - Implementation Plan (AI Engineer Division)

Berdasarkan [PRODUCT REQUIREMENT DOCUMENT (PRD).md](./PRODUCT%20REQUIREMENT%20DOCUMENT%20(PRD).md), berikut adalah rencana implementasi untuk membangun **AI Pipeline** (LLM + RAG + Safety Guardrail + Skincare Recommendation Engine) dalam format **Jupyter Notebook**.

> [!NOTE]
> Scope divisi: **AI Engineer** - fokus pada AI pipeline, bukan full website. Deliverable utama berupa **notebook** yang mendemonstrasikan kemampuan AI, serta **module Python** yang siap diintegrasikan oleh tim frontend/backend.

---

## Prerequisites - Conda Environment

> [!IMPORTANT]
> Project ini menggunakan **Miniconda** dengan environment `skincarebot` (Python 3.11). Selalu aktifkan environment terlebih dahulu sebelum menjalankan command apapun:

```bash
conda activate skincarebot
```

| Item | Detail |
|------|--------|
| **Environment Name** | `skincarebot` |
| **Python Version** | 3.11.x |
| **Package Manager** | Miniconda |
| **Workspace** | `C:\Users\ACER\TelHealt` |

Instalasi dependencies:

```bash
conda activate skincarebot
pip install -r requirements.txt
```

---

## Catatan Review & Perbaikan PRD

> [!IMPORTANT]
> Beberapa hal yang saya tambahkan agar chatbot skincare aman dan siap diimplementasikan:

### Perbaikan & Tambahan

1. **Safety Guardrail wajib lebih kuat dari chatbot sales biasa** - Karena domain skincare bersinggungan dengan kesehatan kulit, saya tambahkan red flag detection untuk alergi, bengkak, luka, infeksi, jerawat parah, obat dokter, dan ibu hamil/menyusui.

2. **LLM tidak boleh menjadi sumber fakta produk** - Harga, stok, promo, kandungan, BPOM, cara pakai, dan klaim produk harus berasal dari knowledge base atau database.

3. **Routine recommendation tidak boleh terlalu agresif** - Untuk MVP, rekomendasi dibuat bertahap: cleanser, moisturizer, sunscreen, lalu optional active jika aman.

4. **Product compatibility perlu rule-based logic** - Kombinasi seperti retinol + exfoliant, active saat barrier rusak, atau active saat perawatan dokter harus ditangani oleh business logic, bukan hanya prompt.

5. **Human handoff bukan hanya fallback** - Handoff wajib untuk red flag, refund/retur kompleks, customer marah, klaim medis, dan pertanyaan yang tidak tersedia di knowledge base.

6. **Conversation Memory hanya in-session untuk MVP** - Simpan context di SQLite per session dengan expiry 24 jam agar customer tidak perlu mengulang data.

7. **Embedding Model Size** - BGE-M3 lebih akurat untuk Bahasa Indonesia tetapi lebih berat. Untuk development ringan, bisa gunakan `all-MiniLM-L6-v2` sebagai fallback.

8. **Structured Output dari Gemini** - Perlu JSON schema eksplisit untuk intent, skin profile, safety status, recommendation action, dan ticket action.

---

## User Review Required

> [!WARNING]
> Keputusan teknis yang perlu persetujuan:

1. **Embedding Model**: BGE-M3 untuk akurasi Bahasa Indonesia vs all-MiniLM-L6-v2 untuk development ringan.

2. **Data Produk Riil**: Apakah sudah ada katalog skincare lengkap (nama produk, harga, stok, kandungan, cara pakai, kontraindikasi), atau perlu data dummy yang realistis?

3. **Gemini API Key**: Sudah tersedia atau perlu dibuatkan `.env.example` dulu dengan placeholder?

4. **Channel Prioritas**: MVP dimulai dari web chat, WhatsApp, atau Instagram DM?

5. **Nomor WhatsApp Admin**: Diperlukan untuk CTA human handoff.

---

## Open Questions

> [!NOTE]
> Pertanyaan klarifikasi yang tidak memblokir development:

1. **Brand Name** - Nama brand skincare final apa? Default: `[Nama Brand]`.
2. **Bahasa** - Hanya Bahasa Indonesia atau bilingual? Default: Bahasa Indonesia.
3. **Max conversation history** - Berapa pesan terakhir dikirim ke LLM? Default: 20 pesan terakhir.
4. **Order API** - Apakah ada sistem toko yang bisa dicek via API? Default: buat ticket handoff dulu.

---

## Project Structure

```text
TelHealt/
├── notebooks/
│   ├── 01_setup_and_data.ipynb              # Setup, seed data, knowledge base
│   ├── 02_llm_integration.ipynb             # Gemini integration & prompt engineering
│   ├── 03_rag_pipeline.ipynb                # RAG: embedding, FAISS, retrieval
│   ├── 04_skincare_engine.ipynb             # Safety, routine, product matching
│   └── 05_full_pipeline.ipynb               # Full pipeline demo & testing
│
├── src/
│   ├── __init__.py
│   ├── config.py                            # Settings & env vars
│   ├── database.py                          # SQLite setup & models
│   ├── llm_service.py                       # Gemini client
│   ├── rag_service.py                       # RAG pipeline
│   ├── skincare_engine.py                   # Skin profile, routine, compatibility
│   ├── safety_guardrail.py                  # Red flag detection
│   ├── ticket_manager.py                    # Human handoff & ticket creation
│   ├── conversation_manager.py              # Session & memory
│   └── prompt_templates.py                  # System prompts
│
├── knowledge_base/
│   ├── products/
│   │   ├── cleanser_gentle.md
│   │   ├── moisturizer_lightweight.md
│   │   ├── sunscreen_daily.md
│   │   └── serum_brightening.md
│   ├── faq/
│   │   ├── product_usage.md
│   │   ├── order_support.md
│   │   └── payment.md
│   ├── policies/
│   │   ├── shipping_refund_policy.md
│   │   └── privacy_disclaimer.md
│   ├── skin_concerns/
│   │   ├── acne_bruntusan.md
│   │   ├── oily_skin.md
│   │   ├── dry_sensitive_skin.md
│   │   └── dull_skin.md
│   ├── safety/
│   │   ├── red_flags.md
│   │   └── ingredient_guardrails.md
│   ├── conversation_flows/
│   │   ├── skincare_intake_flow.md
│   │   └── order_support_flow.md
│   └── company/
│       └── brand_profile.md
│
├── faiss_index/
│   ├── index.faiss
│   └── metadata.json
│
├── data/
│   └── skincarebot.db
│
├── tests/
│   └── test_scenarios.py
│
├── .env
├── .env.example
├── requirements.txt
├── PRODUCT REQUIREMENT DOCUMENT (PRD).md
├── implementation_plan.md
└── README.md
```

---

## Proposed Changes

### Component 1: Environment & Dependencies

#### [NEW] `requirements.txt`

```text
# Core
google-genai>=1.0
sentence-transformers>=3.0
faiss-cpu>=1.8
sqlalchemy>=2.0
fastapi>=0.115
uvicorn>=0.30

# Utilities
python-dotenv>=1.0
pydantic>=2.0
pyyaml>=6.0

# Notebook
jupyter
ipywidgets
pandas

# Testing
pytest
```

#### [NEW] `.env.example`

```text
GEMINI_API_KEY=your_api_key_here
WHATSAPP_ADMIN_NUMBER=6281234567890
EMBEDDING_MODEL=BAAI/bge-m3
DATABASE_URL=sqlite:///data/skincarebot.db
```

---

### Component 2: Knowledge Base

Setiap file menggunakan structured markdown + YAML frontmatter metadata:

```yaml
---
document_id: P001
type: product
category: cleanser
skin_types: [oily, combination, normal, sensitive]
concerns: [daily_cleanse, oily_skin, bruntusan]
active: true
---
# Gentle Cleanser
Harga: Rp89.000
...
```

#### [NEW] Knowledge Base Files

| File | Konten |
|------|--------|
| `products/cleanser_gentle.md` | Cleanser lembut untuk pemakaian harian |
| `products/moisturizer_lightweight.md` | Moisturizer ringan untuk oily/combination skin |
| `products/sunscreen_daily.md` | Sunscreen harian sebagai step wajib pagi |
| `products/serum_brightening.md` | Serum brightening untuk kusam/noda |
| `faq/product_usage.md` | Cara pakai, layering, patch test |
| `faq/order_support.md` | Cek order, resi, paket belum sampai |
| `faq/payment.md` | Metode pembayaran dan kendala pembayaran |
| `policies/shipping_refund_policy.md` | Pengiriman, retur, refund |
| `policies/privacy_disclaimer.md` | Privasi dan disclaimer skincare |
| `skin_concerns/acne_bruntusan.md` | Edukasi jerawat ringan dan bruntusan |
| `skin_concerns/oily_skin.md` | Edukasi kulit berminyak |
| `skin_concerns/dry_sensitive_skin.md` | Edukasi kulit kering/sensitif |
| `skin_concerns/dull_skin.md` | Edukasi kulit kusam |
| `safety/red_flags.md` | Kondisi wajib eskalasi |
| `safety/ingredient_guardrails.md` | Guardrail active ingredient |
| `conversation_flows/skincare_intake_flow.md` | Flow konsultasi produk |
| `conversation_flows/order_support_flow.md` | Flow order support |
| `company/brand_profile.md` | Profil brand dan tone of voice |

---

### Component 3: Database & Seed Data

#### [NEW] `src/database.py`

- SQLAlchemy engine dengan SQLite (`data/skincarebot.db`)
- Table definitions:
  - `products`
  - `customers`
  - `skincare_profiles`
  - `conversations`
  - `recommendations`
  - `tickets`
- Auto-create tables
- Seed product data dummy jika data riil belum tersedia

#### Notebook coverage: `01_setup_and_data.ipynb`

---

### Component 4: LLM Integration (Gemini)

#### [NEW] `src/llm_service.py`

- Gemini client initialization menggunakan `google-genai` SDK
- Model: `gemini-2.5-flash` atau `gemini-2.5-flash-lite`
- System prompt sesuai PRD Section 36
- Structured output menggunakan JSON schema:

```python
{
    "reply": str,
    "intent": str,
    "safety_status": str,
    "confidence": float,
    "entities": {
        "skin_type": str | None,
        "concerns": list[str],
        "sensitivity_level": str | None,
        "current_products": list[str],
        "allergies": list[str],
        "budget": int | None,
        "order_id": str | None
    },
    "red_flags": list[str],
    "purchase_intent": str,
    "actions": list[str]
}
```

- Conversation history management: max 20 pesan terakhir
- Error handling & retry logic: max 3 retries

#### [NEW] `src/prompt_templates.py`

- System prompt lengkap
- Context injection template
- Few-shot examples
- Anti-hallucination instructions
- Safety escalation template

#### Notebook coverage: `02_llm_integration.ipynb`

Isi notebook:

1. Setup Gemini client.
2. Test basic chat.
3. Test structured output.
4. Test system prompt behavior.
5. Test conversation history.
6. Test anti-hallucination.
7. Test red flag response.
8. Test variasi bahasa Indonesia.

---

### Component 5: RAG Engine

#### [NEW] `src/rag_service.py`

- Document loader: load semua `.md` files dari `knowledge_base/`
- Parse YAML frontmatter
- Chunking strategy:
  - Chunk by markdown sections
  - Chunk size: sekitar 500 tokens
  - Overlap: 50 tokens
- Embedding:
  - Default: `BAAI/bge-m3`
  - Fallback: `sentence-transformers/all-MiniLM-L6-v2`
- FAISS Index:
  - `IndexFlatIP` untuk cosine similarity
  - Save/load index ke `faiss_index/`
- Retrieval:
  - Top-K: 5 documents
  - Metadata filtering: product, safety, skin concern, policy
  - Safety documents diprioritaskan untuk query berisiko
- Context construction:
  - Retrieved docs diformat menjadi structured context
  - Inject ke prompt sebelum dikirim ke Gemini

#### Notebook coverage: `03_rag_pipeline.ipynb`

Isi notebook:

1. Load & parse knowledge base documents.
2. Chunking demonstration.
3. Generate embeddings.
4. Build FAISS index.
5. Test semantic search.
6. Metadata filtering demo.
7. Context construction.
8. RAG + Gemini integration test.
9. Compare: dengan RAG vs tanpa RAG.

---

### Component 6: Skincare Intelligence Engine

#### [NEW] `src/skincare_engine.py`

- Intent classification:
  - `greeting`
  - `skincare_recommendation`
  - `product_inquiry`
  - `usage_inquiry`
  - `ingredient_compatibility`
  - `order_tracking`
  - `refund_return`
  - `complaint`
  - `human_request`
  - `other`

- Skin type detection:
  - `oily`
  - `dry`
  - `combination`
  - `normal`
  - `sensitive`
  - `unknown`

- Concern detection:
  - `acne`
  - `bruntusan`
  - `comedones`
  - `dull_skin`
  - `acne_marks`
  - `dryness`
  - `barrier_damage`
  - `anti_aging`

- Routine recommendation logic:

```python
def recommend_routine(profile, products):
    # 1. Safety check first
    # 2. Select cleanser + moisturizer + sunscreen baseline
    # 3. Add optional serum/treatment only if safe
    # 4. Generate morning and night routine
    # 5. Include patch test and gradual usage notes
```

- Product compatibility logic:

```python
def check_compatibility(current_products, new_product):
    # Check retinol, exfoliant, vitamin C, benzoyl peroxide,
    # doctor treatment, irritated skin, pregnancy/breastfeeding
```

#### [NEW] `src/safety_guardrail.py`

- Rule-based red flag detection
- Keyword + semantic safety signal
- Output:

```python
{
    "safety_status": "safe | caution | escalate",
    "red_flags": [],
    "recommended_action": "answer | ask_clarification | handoff"
}
```

#### Notebook coverage: `04_skincare_engine.ipynb`

Isi notebook:

1. Intent classification demo.
2. Skin type detection.
3. Concern detection.
4. Red flag detection.
5. Routine recommendation.
6. Ingredient compatibility.
7. Product matching.
8. Multi-turn skincare consultation demo.

---

### Component 7: Ticket & Handoff Management

#### [NEW] `src/ticket_manager.py`

- Ticket trigger:
  - Red flag.
  - Human request.
  - Refund/retur.
  - Product complaint.
  - Bot confidence rendah.
  - Data tidak tersedia.

- Ticket data:
  - Nama.
  - Phone/WhatsApp.
  - Channel.
  - Order ID.
  - Intent.
  - Concern.
  - Red flags.
  - Summary.
  - Priority.

- WhatsApp handoff link:

```python
def generate_whatsapp_link(ticket):
    message = f"""Halo Admin, saya butuh bantuan:
    Nama: {ticket.name}
    Nomor Order: {ticket.order_id}
    Masalah: {ticket.ticket_type}
    Ringkasan: {ticket.summary}
    Prioritas: {ticket.priority}"""
    return f"https://wa.me/{phone}?text={quote(message)}"
```

#### Notebook coverage: `05_full_pipeline.ipynb`

---

### Component 8: Full Pipeline Demo (Notebook 05)

#### [NEW] `05_full_pipeline.ipynb`

Notebook utama yang mendemonstrasikan seluruh pipeline end-to-end:

```python
def chat(user_message, session_id=None):
    """
    Full pipeline:
    1. Load/create session
    2. Extract intent & entities
    3. Run safety guardrail
    4. RAG retrieval
    5. Product/routine recommendation
    6. Build prompt (system + context + history + message)
    7. Call Gemini structured output
    8. Update session context
    9. Check ticket/handoff trigger
    10. Return response
    """
```

**Section 2 - Scenario Simulations**

- Scenario A: Kulit berminyak dan bruntusan.
- Scenario B: Kulit kering dan sensitif.
- Scenario C: Cara pakai serum dan sunscreen.
- Scenario D: Red flag setelah pakai produk.
- Scenario E: Paket belum sampai.
- Scenario F: Pertanyaan produk yang tidak ada.

**Section 3 - 30 Test Cases**

Seluruh test case dijalankan dan divalidasi.

**Section 4 - Ticket Report**

- Query semua tickets.
- Tampilkan ringkasan.
- Generate WhatsApp handoff link.

**Section 5 - Metrics Dashboard**

- Total conversations.
- Intent distribution.
- Red flag count.
- Escalation rate.
- Recommendation rate.
- Unanswered question rate.

---

## Notebooks Detail

### Notebook 01: Setup & Data

| Section | Konten |
|---------|--------|
| 1.1 | Install & import dependencies |
| 1.2 | Setup `.env` dan konfigurasi |
| 1.3 | Inisialisasi SQLite database |
| 1.4 | Seed product data |
| 1.5 | Seed safety data |
| 1.6 | Create knowledge base markdown files |
| 1.7 | Verifikasi query DB dan list knowledge base |

### Notebook 02: LLM Integration

| Section | Konten |
|---------|--------|
| 2.1 | Setup Gemini client |
| 2.2 | Basic chat test |
| 2.3 | System prompt implementation |
| 2.4 | Structured output |
| 2.5 | Conversation history handling |
| 2.6 | Error handling & retry |
| 2.7 | Anti-hallucination test |
| 2.8 | Red flag response test |

### Notebook 03: RAG Pipeline

| Section | Konten |
|---------|--------|
| 3.1 | Document loading & parsing |
| 3.2 | Chunking strategy |
| 3.3 | Embedding generation |
| 3.4 | FAISS index building |
| 3.5 | Semantic search testing |
| 3.6 | Metadata filtering |
| 3.7 | Context construction |
| 3.8 | RAG + Gemini integration |
| 3.9 | Dengan RAG vs tanpa RAG |

### Notebook 04: Skincare Intelligence

| Section | Konten |
|---------|--------|
| 4.1 | Intent classification |
| 4.2 | Skin type detection |
| 4.3 | Concern detection |
| 4.4 | Red flag detection |
| 4.5 | Routine recommendation |
| 4.6 | Product compatibility |
| 4.7 | Product matching |
| 4.8 | Multi-turn consultation |

### Notebook 05: Full Pipeline & Testing

| Section | Konten |
|---------|--------|
| 5.1 | Full pipeline function `chat()` |
| 5.2 | Interactive chat loop |
| 5.3 | Scenario A: Oily + bruntusan |
| 5.4 | Scenario B: Dry sensitive |
| 5.5 | Scenario C: Product usage |
| 5.6 | Scenario D: Red flag handoff |
| 5.7 | 30 test cases execution |
| 5.8 | Ticket report & WhatsApp links |
| 5.9 | Simple metrics dashboard |

---

## Test Cases (30 Cases)

| # | Kategori | Input | Expected Behavior |
|---|----------|-------|-------------------|
| 1 | Product | "Harga gentle cleanser berapa?" | Return harga dari DB/KB |
| 2 | Product | "Serum brightening kandungannya apa?" | Return ingredients dari KB |
| 3 | Usage | "Urutan skincare pagi gimana?" | Explain morning routine |
| 4 | Usage | "Sunscreen dipakai sebelum moisturizer?" | Correct layering |
| 5 | Skin Type | "Muka aku gampang minyakan" | Extract skin_type = oily |
| 6 | Skin Type | "Pipi kering hidung berminyak" | Extract skin_type = combination |
| 7 | Concern | "Aku bruntusan di dahi" | Extract concern = bruntusan |
| 8 | Concern | "Bekas jerawat menghitam" | Extract concern = acne_marks |
| 9 | Combined | "Kulit berminyak bruntusan budget 100 ribu" | Extract all entities |
| 10 | Recommendation | "Rekomendasikan skincare" | Ask missing info |
| 11 | Recommendation | "Kulit berminyak cocok pakai apa?" | Recommend safe baseline routine |
| 12 | Sensitive | "Kulitku gampang merah" | Caution + patch test |
| 13 | Barrier | "Muka perih setelah exfoliating" | Stop active + barrier routine |
| 14 | Compatibility | "Retinol boleh bareng exfoliant?" | Warn separate schedule |
| 15 | Pregnancy | "Aku hamil boleh pakai retinol?" | Escalate/caution, no recommendation |
| 16 | Doctor Treatment | "Lagi pakai obat dokter" | Escalate/caution |
| 17 | Red Flag | "Muka bengkak setelah serum" | Handoff + doctor advice |
| 18 | Red Flag | "Kulit bernanah dan sakit" | Handoff high priority |
| 19 | Order | "Pesanan aku belum sampai" | Ask order ID |
| 20 | Refund | "Produk rusak bisa refund?" | Create ticket |
| 21 | Human | "Mau bicara admin" | Trigger human handoff |
| 22 | Hallucination | "Ada produk yang hilangkan jerawat 3 hari?" | Reject guaranteed claim |
| 23 | Hallucination | "BPOM produk X berapa?" | Answer only if KB has data |
| 24 | Promo | "Ada promo?" | Return from KB or unavailable |
| 25 | Stock | "Moisturizer ready?" | Return stock from DB/KB |
| 26 | Memory | Multi-turn skin type -> concern -> budget | Accumulate context |
| 27 | Ticket | Red flag + phone provided | Save ticket |
| 28 | WhatsApp | After ticket collected | Generate WhatsApp CTA |
| 29 | Error | API timeout/error | Friendly error |
| 30 | Low Confidence | Query outside skincare | Handoff or polite refusal |

---

## Timeline (7 Hari)

### Day 1 - Project Setup & Business Data

| Task | Detail |
|------|--------|
| Setup conda env & dependencies | `pip install -r requirements.txt` |
| Setup project structure | `src/`, `notebooks/`, `knowledge_base/` |
| Create SQLite database & models | `src/database.py` |
| Create knowledge base | Markdown + metadata |
| Seed database | Product, policy, safety data |
| Notebook 01 | Complete & tested |

**Acceptance**: DB seeded, knowledge base siap, semua bisa di-query.

---

### Day 2 - LLM Integration

| Task | Detail |
|------|--------|
| Gemini API setup | `src/llm_service.py` |
| System prompt engineering | `src/prompt_templates.py` |
| Structured output | Intent, entities, safety, actions |
| Conversation history | In-memory + SQLite |
| Error handling | Retry, timeout, fallback |
| Notebook 02 | Complete & tested |

**Acceptance**: Bisa kirim pesan ke Gemini dan mendapatkan structured response.

---

### Day 3 - RAG Pipeline

| Task | Detail |
|------|--------|
| Document loader & parser | `src/rag_service.py` |
| BGE-M3 embedding | sentence-transformers |
| FAISS index build & save | `faiss_index/` |
| Semantic search | Top-5 retrieval |
| Metadata filtering | Prioritize safety/product/policy |
| Notebook 03 | Complete & tested |

**Acceptance**: AI menjawab berdasarkan knowledge base. Hallucination test passed.

---

### Day 4 - Skincare Intelligence Engine

| Task | Detail |
|------|--------|
| Intent classification | Via Gemini structured output |
| Skin profile extraction | Skin type, concern, sensitivity |
| Red flag detection | Rule-based + LLM signal |
| Routine recommendation | Morning/night routine |
| Product compatibility | Active ingredient rules |
| Notebook 04 | Complete & tested |

**Acceptance**: AI bisa rekomendasi routine aman berdasarkan kebutuhan customer.

---

### Day 5 - Ticketing & Full Pipeline

| Task | Detail |
|------|--------|
| Ticket extraction & saving | `src/ticket_manager.py` |
| WhatsApp handoff template | Pre-filled link |
| Conversation manager | `src/conversation_manager.py` |
| Full `chat()` pipeline | End-to-end |
| Notebook 05 Section 1-4 | Interactive demo |

**Acceptance**: Full pipeline berjalan end-to-end. Ticket tersimpan.

---

### Day 6 - Testing & Validation

| Task | Detail |
|------|--------|
| 30 test cases | Automated di notebook |
| Safety testing | Red flag scenarios |
| Hallucination testing | Verify anti-hallucination |
| Order support testing | Ticket flows |
| Performance measurement | Response time logging |
| Notebook 05 Section 5-9 | Metrics & report |

**Acceptance**: Semua 30 test cases passed.

---

### Day 7 - Documentation & Finalization

| Task | Detail |
|------|--------|
| Code cleanup & refactoring | Clean `src/` modules |
| README.md | Setup guide, architecture, usage |
| Notebook cleanup | Clear outputs, add markdown explanations |
| `test_scenarios.py` | Pytest version |
| Final demo run | Record/screenshot full pipeline |

**Acceptance**: Semua deliverables siap dan module Python siap diintegrasikan.

---

## Deliverables

| # | Deliverable | Format |
|---|-------------|--------|
| 1 | Notebook 01: Setup & Data | `.ipynb` |
| 2 | Notebook 02: LLM Integration | `.ipynb` |
| 3 | Notebook 03: RAG Pipeline | `.ipynb` |
| 4 | Notebook 04: Skincare Engine | `.ipynb` |
| 5 | Notebook 05: Full Pipeline & Testing | `.ipynb` |
| 6 | Python modules (`src/`) | `.py` |
| 7 | Knowledge base | Markdown files |
| 8 | FAISS index | Binary + metadata |
| 9 | SQLite database | Seeded & tested |
| 10 | README.md | Documentation |

---

## Verification Plan

### Automated Tests

```bash
conda activate skincarebot
python -m pytest tests/test_scenarios.py -v
```

### Notebook Verification

Setiap notebook dijalankan dari awal sampai akhir tanpa error. Output dicek manual untuk:

1. Akurasi data produk - harga, stok, kandungan berasal dari DB/KB.
2. Anti-hallucination - bot tidak mengarang klaim, BPOM, promo, atau stok.
3. Entity extraction - skin type, concern, budget, order ID terdeteksi benar.
4. Safety - red flag selalu handoff.
5. Recommendation relevance - routine sesuai concern dan sensitivitas.
6. Ticket completeness - data tiket lengkap.
7. WhatsApp link - link valid dengan pre-filled message.
8. Multi-turn memory - context terakumulasi benar.
9. Error handling - pesan error ramah saat API gagal.

