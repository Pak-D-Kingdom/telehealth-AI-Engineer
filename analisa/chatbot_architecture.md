# Bedah dan Analisis Arsitektur Chatbot AI GlucoCare

Dokumen ini merinci secara komprehensif bagaimana sistem chatbot AI pada GlucoCare bekerja. Sistem ini bukan sekadar chatbot biasa, melainkan asisten medis cerdas berbasis **Multi-Agent** dan **Retrieval-Augmented Generation (RAG)** yang mampu menangani tanya jawab medis, ekstraksi _lead_, _triage_ kegawatdaruratan, serta mengelola state percakapan secara dinamis.

---

## 1. Struktur File Utama (Di Backend)

Seluruh logika chatbot berada di repository backend (`telehealth-backend`). Berikut adalah file-file kunci yang mengendalikan alur kerja chatbot:

*   **`src/routes/chat.routes.ts`**
    Menangani pendaftaran endpoint HTTP (seperti `/api/chat` dan `/api/chat/stream`). Di sini juga terdapat **Rate Limiter** (`chatLimiter`) yang mencegah spam request berbasis IP atau token sesi pengguna.
*   **`src/controllers/chat.controller.ts`**
    Mengontrol masuknya *request* dari pengguna dan menyiapkan *response*. Yang paling krusial adalah fungsi `sendMessageStream` yang mengelola format pengembalian data secara **Server-Sent Events (SSE)** agar jawaban AI bisa mengalir (streaming) seperti ChatGPT.
*   **`src/services/chat.service.ts`**
    Ini adalah "otak" utama dari bisnis logika chatbot. File ini bertugas untuk:
    *   Mengecek cache (jika pertanyaan berulang).
    *   Menyimpan pesan pengguna ke database.
    *   Memanggil *Guardrails* (keamanan input).
    *   Mendelegasikan tugas ke agen-agen spesifik (Router, Vision, Triage).
    *   Menyatukan konteks dari RAG dan menyusun *Prompt*.
    *   Menghasilkan *Dynamic Suggestions* (saran pintar di akhir chat berdasarkan konteks obat, dokter, atau diagnosis).
*   **`src/services/rag.service.ts`**
    Mengurus integrasi *Knowledge Base*. File ini menggunakan **Gemini API** untuk membuat vektor (*embedding*) dari teks, dan melakukan eksekusi query hibrida (gabungan *Vector Cosine Similarity* dan *Full-Text Search*) menggunakan `pgvector` di PostgreSQL untuk menemukan dokumen referensi medis yang paling relevan.
*   **`src/services/ai.service.ts`**
    Mengelola koneksi inferensi ke **Groq API** (Llama 3). File ini memiliki fungsi `streamChatCompletion` yang mengembalikan teks yang di-generate oleh LLM token-demi-token (potongan-demi-potongan).
*   **`src/services/conversation-state.service.ts`**
    Secara pintar (_intelligent extraction_) mengekstrak informasi pasien dari riwayat percakapan (seperti Nama, WhatsApp, Keluhan Utama) dan secara otomatis menyimpannya ke tabel `ChatLead` di database tanpa perlu formulir manual.
*   **`src/services/guardrails.service.ts`**
    Bertugas memblokir perintah-perintah berbahaya (_prompt injection_, ancaman, ujaran kebencian, dll.) sebelum diproses oleh model.
*   **`src/services/agents/*.agent.ts` (Multi-Agent System)**
    Sistem dibagi menjadi beberapa agen spesialis:
    *   `router.agent.ts`: Menganalisis intent (niat) user dan mengarahkan ke agen yang tepat.
    *   `triage.agent.ts`: Agen khusus untuk menangani skenario gawat darurat (Emergency).
    *   `vision.agent.ts`: Agen khusus jika pengguna mengunggah gambar (misalnya foto luka).

---

## 2. Alur Kerja (Flow) Chatbot secara Detail

Berikut adalah langkah-demi-langkah (alur) yang terjadi saat seorang pengguna mengetik pesan dan menekan kirim:

1.  **Validasi & Sesi (Controller/Router)**
    Pesan masuk ke endpoint `/api/chat/stream`. Server mengecek *Rate Limit* dan memvalidasi tipe data menggunakan Zod. Sistem juga membaca *cookie* sesi. Jika pengguna baru, sistem membuat ID Sesi (Token) baru yang bertahan selama 30 hari.
2.  **Input Guardrails (Pengecekan Keamanan)**
    Pesan pengguna dilewatkan ke `validateInputGuardrails`. Jika terdeteksi kata kunci terlarang atau tidak pantas, sistem langsung memotong alur dan membalas dengan kalimat statis (fallback) tanpa memanggil LLM.
3.  **Intent Routing (Router Agent)**
    Sistem membaca 5 riwayat chat terakhir dan pesan baru, lalu mengirimnya ke model kecil (llama-3.1-8b) untuk menentukan "Niat" (*Intent*) pengguna:
    *   Apakah ini pertanyaan biasa? -> Masuk ke jalur Normal RAG.
    *   Apakah ada kondisi gawat darurat (pendarahan, pingsan, dll)? -> Masuk ke jalur `Triage`.
    *   Apakah pengguna melampirkan gambar? -> Masuk ke jalur `Vision`.
4.  **Retrieval-Augmented Generation (RAG)** (Jika jalur normal)
    Pesan pengguna diubah menjadi vektor 3072 dimensi melalui **Gemini Embedding API**. Vektor ini dicocokkan dengan tabel `knowledge_base` di PostgreSQL. Sistem menggunakan pencarian Hibrida (*Vector Similarity* + *Text Search* `tsvector`) untuk mencari 3-4 artikel edukasi diabetes/produk yang paling relevan.
5.  **Prompt Assembly & LLM Inference (Generasi)**
    Sistem menggabungkan:
    *   *System Prompt* (Persona: Asisten Edukasi Diabetes GlucoCare)
    *   *Konteks Referensi* (Hasil dari langkah 4)
    *   *Riwayat Chat (History)*
    *   *Pertanyaan Saat Ini*
    Prompt final ini dikirim ke model besar **Groq (llama-3.3-70b-versatile)**.
6.  **Streaming Respons (SSE)**
    Sebagaimana Groq merangkai jawaban, setiap "kata" (token) yang dihasilkan langsung dikirim (di-*stream*) secara instan ke frontend. Frontend langsung menampilkannya secara *real-time* kepada pasien.
7.  **Post-Processing & Suggestions (Saran Dinamis)**
    Setelah jawaban utuh selesai di-stream, sistem (di backend) mengevaluasi percakapan untuk:
    *   Mendeteksi jika percakapan mengarah ke kebutuhan konsultasi spesialis, lalu otomatis menyisipkan **Rekomendasi Dokter**.
    *   Mendeteksi kata kunci "beli alat" atau "obat", dan menyisipkan **Rekomendasi Produk** terkait.
    *   Membuat *Actionable Suggestions* (Saran balasan yang bisa diklik user, misalnya: "Bagaimana cara pertolongan pertama gula darah drop?").
8.  **Perekaman Lead (Background Task)**
    Percakapan yang baru saja selesai dianalisis ulang di latar belakang untuk mencari tahu apakah ada informasi identitas medis pengguna (Nama, Keluhan, Riwayat Obat) untuk dicatat secara otomatis ke database (Lead Capture).

---

## 3. Penjelasan Cara Kerja Fitur Spesifik

### A. Konsep RAG (Retrieval-Augmented Generation)
Model AI memiliki batasan pengetahuan. Daripada membiarkan AI menjawab sembarangan (*halusinasi*), sistem ini memberinya "Buku Panduan" (Knowledge Base) terlebih dahulu. Saat pasien bertanya, sistem mencari halaman buku yang relevan, lalu AI diminta membaca halaman tersebut untuk menjawab pertanyaan pasien.

### B. Pencarian Hibrida (Hybrid Search)
Pada `rag.service.ts`, pencarian tidak hanya menggunakan *pgvector* (kesamaan makna matematis/vektor). Terkadang pengguna mencari nomor SKU spesifik atau istilah medis pasti yang sulit dicari maknanya. Oleh karena itu, sistem menggabungkan *Cosine Similarity Vector* dan pencarian teks penuh (*Full-Text Search* bawaan Postgres) agar hasilnya paling akurat.

### C. Server-Sent Events (SSE)
Tanpa SSE, jika AI butuh 5 detik untuk berpikir, layar pengguna akan membeku selama 5 detik sebelum teks panjang muncul. Dengan SSE (`res.write('event: token\n...')` di `chat.controller.ts`), koneksi HTTP tetap dibuka (keep-alive). Setiap kepingan kata dari AI langsung disalurkan. Ini memberikan ilusi bahwa robot sedang "mengetik" secara *real-time*.

### D. Manajemen Sesi dengan Cookie
Chatbot tidak memerlukan login (bersifat anonim). Namun riwayat chat harus tetap diingat. `chat.service.ts` menggunakan token acak yang disimpan di Cookie browser (`CHAT_SESSION_COOKIE_NAME`). Setiap kali pengguna menanyakan sesuatu, token ini dikirim ke backend untuk menarik riwayat (*history*) dari tabel database `ChatMessage`. Sesi akan kedaluwarsa secara otomatis dalam 30 hari jika tidak ada aktivitas.
