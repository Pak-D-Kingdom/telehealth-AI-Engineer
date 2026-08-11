# PRODUCT REQUIREMENT DOCUMENT (PRD)

## AI Customer Service Chatbot untuk Skincare Wajah

**Version:** 1.0 - MVP  
**Target Development:** 7 Hari  
**Platform:** Website / WhatsApp / Instagram DM Skincare Brand  
**Primary Objective:** Meningkatkan kualitas customer service, membantu rekomendasi skincare dasar, dan mengarahkan customer ke pembelian atau human agent dengan aman.

---

# 1. Executive Summary

AI Customer Service Chatbot adalah chatbot berbasis Large Language Model (LLM) yang membantu customer brand skincare wajah melalui percakapan natural.

Chatbot dirancang bukan hanya sebagai FAQ chatbot, tetapi sebagai **AI Skincare Customer Assistant** yang dapat:

- Memahami concern kulit customer.
- Menanyakan informasi yang belum diketahui.
- Mencari informasi produk dari knowledge base.
- Memberikan rekomendasi routine skincare dasar.
- Menjelaskan cara pakai, layering, patch test, dan batasan pemakaian.
- Menjawab pertanyaan order, pengiriman, refund, dan retur.
- Mendeteksi red flag keamanan kulit.
- Mengumpulkan data tiket untuk CS.
- Mengarahkan customer ke checkout, WhatsApp admin, atau human handoff.

Sistem menggunakan pendekatan **LLM + RAG + Safety Guardrail + Business Logic**, sehingga LLM tidak menjadi sumber kebenaran untuk harga, stok, promo, klaim produk, atau kebijakan operasional.

---

# 2. Background

Bisnis skincare wajah biasanya menerima banyak pertanyaan berulang seperti:

- Produk apa yang cocok untuk kulit berminyak?
- Boleh dipakai untuk kulit sensitif?
- Urutan pakainya bagaimana?
- Bisa dipakai bareng retinol, exfoliating toner, atau vitamin C?
- Berapa lama hasil terlihat?
- Apakah aman untuk ibu hamil/menyusui?
- Pesanan saya sudah dikirim atau belum?
- Bagaimana cara refund jika produk rusak?

Customer sering membutuhkan jawaban cepat sebelum membeli. Jika customer service lambat, customer bisa batal checkout atau pindah ke brand lain.

AI Customer Service Chatbot akan membantu brand memberikan jawaban cepat, konsisten, personal, dan tetap aman secara klaim skincare.

---

# 3. Problem Statement

### Problem 1 - Customer bingung memilih produk

Customer sering tidak tahu jenis kulit, concern utama, atau produk yang cocok untuk rutinitas pagi dan malam.

### Problem 2 - Pertanyaan repetitive membebani CS

CS banyak menjawab pertanyaan yang sama tentang cara pakai, kandungan, promo, pengiriman, dan refund.

### Problem 3 - Risiko rekomendasi skincare yang tidak aman

Skincare memiliki batasan keamanan, terutama untuk kulit sensitif, reaksi alergi, ibu hamil/menyusui, obat dokter, dan active ingredient.

### Problem 4 - Knowledge produk tersebar

Informasi produk, harga, stok, promo, cara pakai, dan kebijakan sering berada di dokumen berbeda sehingga jawaban CS tidak selalu konsisten.

### Problem 5 - Website belum optimal untuk conversion

Website menampilkan produk, tetapi belum aktif membantu customer memilih routine dan melanjutkan ke checkout.

---

# 4. Product Vision

> **Mengubah channel customer service skincare menjadi AI-powered consultation and support channel yang mampu membantu customer memahami kebutuhan kulit, menemukan produk yang sesuai, dan meneruskan kasus berisiko ke human agent.**

---

# 5. Product Goals

## Primary Goals

1. Memberikan respons customer service 24/7.
2. Membantu customer menemukan produk dan routine skincare dasar.
3. Mengurangi pertanyaan repetitive ke CS manusia.
4. Menjaga jawaban produk tetap konsisten dengan knowledge base.
5. Mendeteksi red flag dan melakukan eskalasi.
6. Meningkatkan conversion dari percakapan konsultasi.

## Secondary Goals

1. Mengumpulkan insight concern kulit customer.
2. Meningkatkan customer satisfaction.
3. Menyediakan data tiket dan ringkasan percakapan untuk CS.
4. Menjadi fondasi AI assistant untuk omnichannel commerce.

---

# 6. Success Metrics

### Automated Resolution Rate

Persentase percakapan yang selesai tanpa human agent.

### Escalation Accuracy

Persentase skenario red flag yang berhasil diarahkan ke human agent/dokter.

### Chat Engagement Rate

Jumlah visitor yang menggunakan chatbot dibandingkan total visitor.

### Recommendation Success

Jumlah percakapan konsultasi yang menghasilkan rekomendasi routine atau produk.

### Conversion Rate

Persentase sesi chatbot yang berujung ke checkout atau WhatsApp CTA.

### Customer Satisfaction Score

Rating customer setelah percakapan.

### Unanswered Question Rate

Persentase pertanyaan yang tidak bisa dijawab karena knowledge base belum tersedia.

---

# 7. Target Users

## Persona 1 - First-Time Skincare Buyer

Customer baru yang belum tahu jenis kulit dan membutuhkan routine sederhana.

Concern umum:

- Kulit kusam.
- Kulit berminyak.
- Bruntusan.
- Komedo.
- Jerawat ringan.

---

## Persona 2 - Existing Customer

Customer lama yang ingin tahu:

- Cara layering.
- Produk boleh digabung atau tidak.
- Frekuensi pemakaian.
- Kapan repurchase.
- Produk alternatif.

---

## Persona 3 - Sensitive Skin Customer

Customer dengan riwayat iritasi atau alergi.

Membutuhkan jawaban ekstra hati-hati, patch test, dan eskalasi jika ada reaksi berat.

---

## Persona 4 - Order Support Customer

Customer yang menanyakan:

- Status pesanan.
- Resi.
- Paket belum sampai.
- Produk rusak.
- Salah kirim.
- Refund/retur.

---

# 8. User Journey

```text
Customer membuka website / WhatsApp / Instagram
        |
Melihat Chatbot
        |
Customer memulai percakapan
        |
AI memahami intent
        |
AI menanyakan informasi yang kurang
        |
AI melakukan safety screening
        |
AI mencari informasi dari knowledge base
        |
AI memberikan jawaban / rekomendasi
        |
Customer mempertimbangkan
        |
AI menawarkan CTA checkout / WhatsApp / human agent
        |
Jika red flag atau kompleks, AI handoff ke CS
```

---

# 9. Core User Flow

### Example - Rekomendasi Skincare

**Customer**

> Kak, kulit aku berminyak dan gampang bruntusan. Produk apa yang cocok?

**AI**

> Siap Kak. Aku bantu cari yang paling aman dulu ya. Bruntusannya lebih sering di area dahi/pipi, dan sekarang Kakak sedang pakai produk aktif seperti exfoliating toner, retinol, atau obat dokter?

**Customer**

> Di dahi, sekarang cuma pakai facial wash dan sunscreen.

**AI**

> Baik Kak. Untuk kulit berminyak dan bruntusan ringan, mulai dari routine simpel dulu: cleanser lembut, moisturizer ringan, dan sunscreen pagi hari. Kalau kulit sudah stabil, bisa tambah exfoliating product 1-2 kali seminggu di malam hari. Jangan lupa patch test dulu sebelum pakai produk baru.

---

### Example - Red Flag

**Customer**

> Setelah pakai serum, muka aku bengkak dan perih banget.

**AI**

> Maaf Kak, itu termasuk keluhan yang perlu ditangani lebih hati-hati. Untuk sementara hentikan dulu produk yang dicurigai dan jangan tambah produk aktif lain. Karena ada bengkak dan perih berat, sebaiknya segera konsultasi ke dokter atau fasilitas kesehatan. Aku juga akan bantu teruskan ke admin agar keluhannya dicatat.

---

# 10. Functional Requirements

## FR-01 - Chat Interface

Sistem harus menyediakan chatbot interface.

Fitur:

- Open/close chatbot.
- Input text.
- Send message.
- Chat history.
- Loading indicator.
- Error handling.
- Quick reply buttons.
- Optional product card.

---

# 11. FR-02 - Natural Language Conversation

Chatbot harus memahami pertanyaan natural Bahasa Indonesia.

Contoh:

> "Kulit aku kusam, cocoknya pakai apa?"

> "Serum ini boleh dipakai bareng retinol?"

> "Urutan skincare pagi gimana?"

> "Paket aku belum sampai."

---

# 12. FR-03 - Skincare Intake

Chatbot harus dapat mengumpulkan informasi:

- Jenis kulit.
- Concern utama.
- Riwayat sensitivitas/alergi.
- Produk yang sedang dipakai.
- Active ingredient yang digunakan.
- Kondisi hamil/menyusui.
- Budget.
- Preferensi routine simpel/lengkap.

Chatbot tidak boleh menanyakan semua informasi sekaligus.

---

# 13. FR-04 - Product Knowledge

Chatbot harus menjawab berdasarkan informasi:

- Nama produk.
- Kategori.
- Fungsi utama.
- Kandungan utama.
- Cara pakai.
- Frekuensi pemakaian.
- Cocok untuk jenis kulit/concern tertentu.
- Kontraindikasi.
- Harga.
- Stok.
- Promo.

---

# 14. FR-05 - Routine Recommendation

Chatbot harus dapat merekomendasikan routine dasar:

- Morning routine.
- Night routine.
- Produk yang dipakai harian.
- Produk yang dipakai mingguan.
- Urutan pemakaian.
- Cara mulai bertahap.
- Patch test.

Contoh:

```text
Input:
Skin type = berminyak
Concern = bruntusan
Sensitivity = rendah

        |

Recommendation Engine

        |

Cleanser + lightweight moisturizer + sunscreen + optional exfoliant
```

---

# 15. FR-06 - Skin Type Detection

Chatbot harus dapat memahami variasi bahasa:

> "Muka aku gampang minyakan."

> "Pipi kering tapi hidung berminyak."

> "Kulitku gampang merah."

Output:

```json
{
  "skin_type": "combination",
  "sensitivity_level": "medium"
}
```

---

# 16. FR-07 - Concern Detection

Sistem harus dapat mengenali concern:

- Acne ringan.
- Bruntusan.
- Komedo.
- Kulit kusam.
- Bekas jerawat.
- Kulit kering.
- Berminyak.
- Skin barrier.
- Sensitif.
- Anti-aging.

---

# 17. FR-08 - Safety Red Flag Detection

Sistem harus mendeteksi kondisi:

- Bengkak wajah, bibir, atau mata.
- Sesak napas.
- Ruam menyebar cepat.
- Luka terbuka atau bernanah.
- Nyeri hebat.
- Kulit terasa terbakar.
- Jerawat kistik parah.
- Sedang memakai obat dokter.
- Hamil/menyusui dan bertanya active ingredient berisiko.

Jika red flag terdeteksi, chatbot wajib melakukan human handoff dan menyarankan konsultasi dokter/fasilitas kesehatan.

---

# 18. FR-09 - Product Compatibility

Chatbot harus dapat menjelaskan kombinasi kandungan yang perlu hati-hati:

- Retinol dengan exfoliant.
- Banyak active baru sekaligus.
- Exfoliating product saat barrier rusak.
- Active kuat saat sedang memakai obat dokter.

---

# 19. FR-10 - Price and Stock Handling

Backend harus mengambil harga dan stok dari database atau katalog.

LLM tidak boleh mengarang harga, promo, stok, nomor BPOM, atau klaim klinis.

---

# 20. FR-11 - Upselling

Jika terdapat produk yang lebih sesuai atau lebih lengkap, chatbot dapat menawarkan upgrade.

Upselling harus:

- Relevan dengan concern.
- Tidak memaksa.
- Menjelaskan value.
- Berdasarkan data produk.

---

# 21. FR-12 - Cross-Selling

Chatbot dapat menawarkan produk pelengkap:

- Cleanser.
- Moisturizer.
- Sunscreen.
- Serum pendukung.
- Masker atau spot treatment jika tersedia.

Cross-selling harus memperhatikan keamanan active ingredient.

---

# 22. FR-13 - Order Support

Chatbot harus dapat membantu:

- Cek status order.
- Cek resi.
- Paket belum sampai.
- Produk rusak.
- Produk salah kirim.
- Refund.
- Retur.

---

# 23. FR-14 - Ticket Collection

Ketika customer membutuhkan CS, sistem mengumpulkan:

- Nama.
- Nomor WhatsApp.
- Nomor order.
- Jenis masalah.
- Kronologi.
- Bukti foto/video jika relevan.
- Prioritas tiket.

---

# 24. FR-15 - Human Handoff

Chatbot harus mengalihkan ke manusia ketika:

- Customer meminta admin.
- Ada red flag.
- Pertanyaan tidak tersedia di knowledge base.
- Kasus refund/retur kompleks.
- Customer marah atau tidak puas.
- Customer bertanya diagnosis medis.

---

# 25. FR-16 - Anti-Hallucination

Chatbot dilarang mengarang:

- Harga.
- Stok.
- Promo.
- Nomor BPOM.
- Klaim klinis.
- Kandungan produk.
- Estimasi pengiriman.
- Kebijakan refund.

Jika data tidak ditemukan:

> "Maaf Kak, informasinya belum tersedia di sistem saya. Agar tidak keliru, saya bantu hubungkan Kakak dengan admin ya."

---

# 26. Technical Architecture

```text
                         CHANNEL
                            |
                            v
               Web Chat / WhatsApp / Instagram
                            |
                            v
                       FastAPI API
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
       Conversation      Safety        Ticket Manager
         Manager        Guardrail
             |              |
             +------+-------+
                    v
                 RAG Layer
                    |
          +---------+---------+
          v                   v
     FAISS Vector        Product Data
       Store             JSON/SQLite
          |
          v
     Relevant Context
          |
          v
   Gemini 2.5 Flash / Flash-Lite
          |
          v
 Structured / Natural Response
          |
     +----+-----+
     v          v
 Product CTA  Human Handoff
```

---

# 27. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React / Existing Web Widget |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| LLM | Gemini 2.5 Flash-Lite / Flash |
| Embedding | BGE-M3 |
| Vector Store | FAISS |
| Database | SQLite |
| API | REST |
| Notebook | Jupyter |
| Deployment | Render / Railway / VPS |

---

# 28. Why Gemini?

Gemini digunakan karena MVP memiliki target satu minggu.

Keuntungan:

- Tidak membutuhkan GPU.
- API integration sederhana.
- Cocok untuk conversational AI.
- Mendukung structured output.
- Mendukung function calling.
- Dapat digunakan untuk Bahasa Indonesia.

Model open-source seperti Qwen atau Llama dapat menjadi tahap pengembangan berikutnya, tetapi tidak menjadi prioritas MVP.

---

# 29. RAG Architecture

```text
Business Data
     |
     +-- Products
     +-- FAQ
     +-- Policies
     +-- Skin Concerns
     +-- Safety Rules
     +-- Brand Info
            |
            v
      Document Loader
            |
            v
         Chunking
            |
            v
      BGE-M3 Embedding
            |
            v
          FAISS
            |
            v
      Similarity Search
            |
            v
      Top-K Documents
            |
            v
    Context Construction
            |
            v
         Gemini
            |
            v
      Final Response
```

---

# 30. Knowledge Base Structure

```text
knowledge_base/
├── products/
│   ├── cleanser_gentle.md
│   ├── moisturizer_lightweight.md
│   ├── sunscreen_daily.md
│   └── serum_brightening.md
├── faq/
│   ├── product_usage.md
│   ├── order_support.md
│   └── payment.md
├── policies/
│   ├── shipping_refund_policy.md
│   └── privacy_disclaimer.md
├── skin_concerns/
│   ├── acne_bruntusan.md
│   ├── oily_skin.md
│   ├── dry_sensitive_skin.md
│   └── dull_skin.md
├── safety/
│   ├── red_flags.md
│   └── ingredient_guardrails.md
├── conversation_flows/
│   ├── skincare_intake_flow.md
│   └── order_support_flow.md
└── company/
    └── brand_profile.md
```

---

# 31. RAG Metadata

Setiap dokumen harus memiliki metadata:

```json
{
  "document_id": "P001",
  "type": "product",
  "category": "serum",
  "skin_types": ["oily", "combination"],
  "concerns": ["dull_skin", "acne_marks"],
  "active_ingredients": ["niacinamide"],
  "safety_level": "low_risk",
  "active": true
}
```

Metadata dapat digunakan untuk filtering sebelum retrieval.

---

# 32. RAG Retrieval Strategy

Query customer:

> "Kulit aku berminyak dan bruntusan, budget 100 ribuan."

Sistem melakukan:

```text
Query
 |
Semantic Search
 |
Top 5 Documents
 |
Metadata Filtering
 |
Safety Guardrail
 |
Relevant Products
 |
Gemini
```

Prioritaskan:

1. Safety rules.
2. Product information.
3. Product usage.
4. Skin concern education.
5. Policies.
6. Order support.

---

# 33. Database Schema

Untuk MVP gunakan SQLite.

## products

```text
id
sku
name
description
category
price
stock_status
skin_types
concerns
active_ingredients
contraindications
usage_instruction
active
created_at
updated_at
```

## customers

```text
id
name
phone
email
channel
created_at
```

## skincare_profiles

```text
id
customer_id
skin_type
concerns
sensitivity_level
allergies
current_products
pregnancy_or_breastfeeding
doctor_treatment
created_at
updated_at
```

## conversations

```text
id
session_id
sender
message
intent
confidence
created_at
```

## recommendations

```text
id
session_id
customer_id
routine_json
product_ids
safety_notes
created_at
```

## tickets

```text
id
session_id
customer_id
ticket_type
priority
summary
status
assigned_to
created_at
```

---

# 34. API Specification

## POST `/api/chat`

Request:

```json
{
  "session_id": "abc123",
  "message": "Kulit aku berminyak dan bruntusan, cocok pakai apa?"
}
```

Response:

```json
{
  "reply": "Siap Kak, aku bantu pilihkan yang aman dulu ya...",
  "intent": "skincare_recommendation",
  "safety_status": "safe",
  "entities": {
    "skin_type": "oily",
    "concerns": ["bruntusan"],
    "budget": null,
    "current_products": []
  },
  "recommendations": [
    {
      "product_id": "P001",
      "name": "Gentle Cleanser",
      "category": "cleanser"
    }
  ],
  "actions": ["ask_clarification", "show_products"]
}
```

---

# 35. Structured LLM Output

LLM digunakan untuk ekstraksi intent, entity, safety signal, dan action.

```json
{
  "intent": "skincare_recommendation",
  "skin_type": "oily",
  "concerns": ["bruntusan"],
  "sensitivity_level": "unknown",
  "current_products": ["facial wash", "sunscreen"],
  "budget": 100000,
  "red_flags": [],
  "safety_status": "safe",
  "purchase_intent": "medium",
  "actions": ["retrieve_products", "ask_clarification"]
}
```

Backend kemudian melakukan query terhadap knowledge base dan database.

---

# 36. System Prompt

## Role

Kamu adalah **AI Customer Service Assistant** untuk brand skincare wajah.

Tujuanmu adalah membantu customer memahami produk, cara pakai, routine skincare dasar, order support, dan mengarahkan customer ke admin jika kasusnya kompleks atau berisiko.

## Behavior

Kamu harus:

- Ramah.
- Profesional.
- Natural.
- Ringkas.
- Aman.
- Tidak menghakimi kondisi kulit customer.

## Rules

1. Jangan mendiagnosis penyakit kulit.
2. Jangan memberi resep obat.
3. Jangan mengarang harga, stok, promo, BPOM, atau klaim produk.
4. Gunakan knowledge base sebagai sumber informasi.
5. Jika data tidak ditemukan, tawarkan bantuan admin.
6. Jika ada red flag, hentikan rekomendasi produk dan eskalasi.
7. Selalu sarankan patch test untuk produk baru.
8. Jangan menjamin hasil dalam waktu tertentu.
9. Jangan menyarankan terlalu banyak active ingredient sekaligus.

## Consultation Strategy

Ketahui bila memungkinkan:

- Skin type.
- Concern.
- Sensitivity.
- Current products.
- Allergy history.
- Pregnancy/breastfeeding status jika relevan.
- Budget.

Jangan menanyakan semua informasi sekaligus.

## Recommendation

Rekomendasikan produk berdasarkan:

- Jenis kulit.
- Concern.
- Tingkat sensitivitas.
- Produk yang sedang dipakai.
- Kontraindikasi.
- Data produk yang tersedia.

## CTA

Gunakan CTA ketika customer menunjukkan minat:

- Lihat produk.
- Tambahkan ke keranjang.
- Simpan routine.
- Hubungi admin.
- Buat tiket bantuan.

---

# 37. Conversation Memory

Chatbot harus menyimpan informasi penting selama sesi:

```json
{
  "skin_type": "oily",
  "concerns": ["bruntusan", "komedo"],
  "current_products": ["cleanser", "sunscreen"],
  "budget": 150000,
  "selected_products": ["P001", "P003"],
  "safety_status": "safe"
}
```

Sehingga customer tidak perlu mengulang data pada percakapan berikutnya.

---

# 38. Frontend UX

Chatbot harus menyediakan:

### Welcome Message

> "Halo Kak, aku bisa bantu pilih skincare sesuai jenis kulit, jelaskan cara pakai produk, atau bantu cek pesanan. Mau dibantu yang mana?"

### Quick Actions

```text
[Konsultasi Produk]
[Cara Pakai]
[Cek Pesanan]
[Refund/Retur]
```

### Product Card

Menampilkan:

- Foto.
- Nama produk.
- Kategori.
- Harga.
- Cocok untuk.
- CTA.

---

# 39. Error Handling

Jika LLM/API error:

> "Maaf Kak, aku sedang mengalami kendala. Kakak bisa coba beberapa saat lagi atau aku bantu teruskan ke admin."

Jika RAG tidak menemukan informasi:

> "Untuk informasi itu aku belum punya datanya di sistem. Supaya tidak keliru, aku bantu hubungkan Kakak dengan admin ya."

Jika red flag:

> "Keluhan Kakak perlu ditangani lebih hati-hati. Aku sarankan hentikan sementara produk yang dicurigai dan konsultasi ke dokter/fasilitas kesehatan. Aku bantu teruskan ke admin juga ya."

---

# 40. Security

MVP minimal harus memiliki:

- API key disimpan di environment variable.
- API key tidak boleh berada di frontend.
- Input validation.
- Rate limiting sederhana.
- Sanitization.
- Tidak menyimpan data sensitif yang tidak diperlukan.
- Foto wajah hanya dengan consent.
- HTTPS pada deployment.

---

# 41. Scope MVP

## Included

| Feature | Status |
|---|---|
| Chat UI | Included |
| Gemini integration | Included |
| Conversation memory | Included |
| Product knowledge | Included |
| RAG | Included |
| Skincare intake | Included |
| Skin type detection | Included |
| Concern detection | Included |
| Routine recommendation | Included |
| Safety red flag detection | Included |
| Product compatibility | Included |
| Order support | Included |
| Ticket collection | Included |
| Human handoff | Included |
| Anti-hallucination | Included |

## Excluded

| Feature | Status |
|---|---|
| Diagnosis medis | Excluded |
| Resep obat | Excluded |
| Payment gateway | Excluded |
| Advanced CRM integration | Excluded |
| Fine-tuning | Excluded |
| Self-hosted LLM | Excluded |
| Computer vision diagnosis | Excluded |
| Real-time inventory complex | Excluded |

---

# 42. Seven-Day Development Plan

## Day 1 - Business Data & Project Setup

Deliverables:

- Product data.
- FAQ.
- Policy data.
- Safety knowledge.
- FastAPI project.
- Repository structure.

Acceptance:

> Knowledge base awal tersedia dan project bisa dijalankan lokal.

---

## Day 2 - LLM Integration

Deliverables:

- Gemini API.
- `/api/chat`.
- System prompt.
- Structured output.
- Conversation history.
- Basic error handling.

Acceptance:

> User dapat mengirim pesan dan mendapatkan response AI.

---

## Day 3 - RAG

Deliverables:

- Knowledge base loader.
- Document chunking.
- BGE-M3 embedding.
- FAISS index.
- Retriever.
- Context injection.

Acceptance:

> AI dapat menjawab berdasarkan knowledge base.

---

## Day 4 - Skincare Intelligence

Deliverables:

- Intent detection.
- Skin type detection.
- Concern detection.
- Safety guardrail.
- Routine recommendation.
- Product compatibility logic.

Acceptance:

> AI dapat memberikan rekomendasi skincare dasar yang aman dan relevan.

---

## Day 5 - Ticketing & Handoff

Deliverables:

- Ticket schema.
- Handoff summary.
- CS escalation flow.
- Order support flow.
- WhatsApp CTA.

Acceptance:

> Customer yang butuh bantuan manusia dapat menghasilkan tiket/ringkasan.

---

## Day 6 - Frontend & UX

Deliverables:

- Chat widget.
- Quick actions.
- Product cards.
- CTA.
- Loading state.
- Error state.
- Responsive design.

Acceptance:

> Chatbot terlihat siap digunakan customer, bukan hanya demo backend.

---

## Day 7 - Testing & Deployment

Deliverables:

- Functional testing.
- Safety testing.
- Hallucination testing.
- API testing.
- Deployment.
- Final demo.

---

# 43. Testing Scenario

Minimal 30 test cases.

### Product

> "Serum brightening cocok untuk kulit berminyak?"

### Usage

> "Urutan pakai sunscreen dan moisturizer gimana?"

### Skin Type

> "Pipi aku kering tapi hidung berminyak."

### Concern

> "Aku bruntusan di dahi."

### Combination

> "Boleh pakai exfoliating toner bareng retinol?"

### Sensitive

> "Kulitku gampang merah dan perih."

### Red Flag

> "Muka aku bengkak setelah pakai serum."

### Pregnancy

> "Aku hamil, boleh pakai retinol?"

### Order

> "Pesanan aku belum sampai."

### Refund

> "Produk datang rusak, bisa refund?"

### Human

> "Mau bicara admin."

### Hallucination

> "Ada produk yang pasti menghilangkan jerawat dalam 3 hari?"

Bot harus menolak klaim pasti dan tidak mengarang informasi.

---

# 44. Acceptance Criteria

MVP dinyatakan selesai apabila:

### AC-01

Customer dapat membuka chatbot dari website/channel.

### AC-02

Customer dapat melakukan percakapan natural language.

### AC-03

AI dapat memahami jenis kulit.

### AC-04

AI dapat memahami concern kulit.

### AC-05

AI dapat mengambil informasi produk dari knowledge base.

### AC-06

AI dapat memberikan rekomendasi routine dasar.

### AC-07

AI dapat menjelaskan cara pakai dan patch test.

### AC-08

Harga, stok, dan promo berasal dari database/knowledge base.

### AC-09

AI dapat mendeteksi red flag.

### AC-10

AI dapat melakukan human handoff.

### AC-11

AI dapat membuat tiket CS.

### AC-12

AI tidak mengarang klaim medis atau data produk.

### AC-13

Website dapat digunakan pada desktop dan mobile.

---

# 45. Final MVP Architecture

```text
                         CUSTOMER
                            |
                            v
                 Web / WhatsApp / Instagram
                            |
                            v
                    +---------------+
                    |    FastAPI    |
                    +-------+-------+
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
        Conversation    Skincare       Ticket System
          Manager       Engine
             |              |
             +------+-------+
                    |
                    v
              +-----------+
              | RAG Engine|
              +-----+-----+
                    |
             +------+------+
             v             v
           FAISS        SQLite
             |             |
             |        Product Data
             |
             v
       Relevant Docs
             |
             v
      +--------------+
      | Gemini 2.5   |
      | Flash/Lite   |
      +------+-------+
             |
             v
       AI CS Response
             |
       +-----+------+
       v            v
 Product Card   Human Handoff
```

---

# 46. Final Product Definition

Produk MVP ini bukan sekadar:

> **"Chatbot untuk menjawab pertanyaan skincare."**

Tetapi:

> **"AI Customer Service Assistant berbasis LLM dan RAG yang memahami concern kulit customer, mengambil fakta dari knowledge base, memberikan rekomendasi routine skincare dasar yang aman, mendeteksi red flag, dan mengubah percakapan menjadi checkout atau tiket CS yang siap ditindaklanjuti."**

### Core AI Pipeline

```text
Customer Message
       |
Intent & Entity Extraction
       |
Safety Guardrail
       |
Business Logic
       |
RAG Retrieval
       |
Product / Policy Retrieval
       |
LLM Response Generation
       |
CTA / Handoff
       |
Checkout / Ticket
```

### Prinsip arsitektur utama

> **LLM memahami pelanggan.**  
> **RAG menyediakan knowledge.**  
> **Database menyimpan fakta produk dan kebijakan.**  
> **Safety guardrail menentukan batas aman.**  
> **Business logic menentukan rekomendasi.**  
> **LLM menyampaikan jawaban secara natural.**

Dengan scope ini, project realistis diselesaikan dalam 7 hari dan cukup kuat untuk dipresentasikan sebagai project **AI Engineer / Generative AI**, bukan sekadar chatbot FAQ.

