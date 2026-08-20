# Penjelasan Fitur, Alur, dan Cara Kerja (GlucoCare Telehealth)

Dokumen ini berisi penjelasan lengkap mengenai fitur-fitur yang telah dibangun pada proyek GlucoCare Telehealth, beserta alur arsitektur dan cara kerjanya.

## 1. Fitur yang Telah Dibuat

Berdasarkan sistem yang telah dikembangkan saat ini, proyek ini memiliki fitur-fitur utama sebagai berikut:

### a. Sistem Katalog Publik
Fitur yang memungkinkan pengguna publik (tanpa harus login) untuk melihat daftar layanan dan produk yang tersedia.
- **Katalog Produk Kesehatan**: Menampilkan daftar produk obat, suplemen, atau alat kesehatan yang aktif.
- **Direktori Dokter**: Menampilkan daftar dokter yang tersedia untuk konsultasi berdasarkan kategori spesialisasi mereka.

### b. Chatbot AI Berbasis RAG (Retrieval-Augmented Generation)
Asisten medis cerdas (AI) interaktif yang membantu menjawab pertanyaan pasien.
- **Kemampuan RAG**: AI tidak hanya mengandalkan pengetahuan umum (dari model LLM), tetapi juga mengambil informasi dari *knowledge base* (sumber dokumen medis internal) yang disimpan di database `pgvector`. Hal ini membuat jawaban lebih akurat dan sesuai dengan standar medis sistem ini.
- **Deteksi Kondisi Darurat (Emergency)**: AI dapat mendeteksi dari konteks obrolan jika pasien sedang dalam kondisi gawat darurat (misalnya sesak napas berat, nyeri dada) dan segera menyarankan tindakan medis darurat.
- **Ekstraksi Lead/Data Pasien**: Chatbot dirancang untuk secara otomatis mengumpulkan informasi relevan (lead) dari pasien selama percakapan (seperti keluhan utama, riwayat penyakit) untuk diteruskan ke dokter.

### c. Autentikasi Admin
Sistem keamanan untuk mengakses Dashboard Admin.
- **HTTP-Only Cookies**: Login menggunakan sesi berbasis cookie yang aman dari serangan XSS (Cross-Site Scripting).
- **Password Hashing**: Menggunakan algoritma Argon2id untuk mengenkripsi kata sandi secara kuat.

### d. Dashboard Admin
Panel kontrol berbasis web (CMS) untuk mengelola data sistem.
- **Manajemen Master Data**: Admin dapat melakukan CRUD (Create, Read, Update, Delete) untuk data Produk dan Dokter.
- **Pemantauan Riwayat Chat**: Admin dapat melihat riwayat percakapan pasien dengan AI serta data lead pasien yang berhasil diekstrak, membantu evaluasi layanan.

### e. Infrastruktur Database Dockerized
Pengaturan database PostgreSQL dan ekstensi vektor (pgvector) yang disatukan dalam lingkungan Docker untuk kemudahan deployment.

---

## 2. Alur Arsitektur Sistem

Aplikasi ini dibangun menggunakan arsitektur **Client-Server** yang dipisahkan menjadi Frontend (Next.js) dan Backend (Express.js):

1. **Client Layer (Next.js Frontend)**: Bertanggung jawab merender antarmuka pengguna (UI). Berkomunikasi dengan backend melalui REST API. Untuk fitur chat, frontend menggunakan **Server-Sent Events (SSE)** agar bisa menampilkan balasan dari chatbot secara *real-time* kata per kata (streaming).
2. **API Layer (Express.js + Bun Backend)**: Mengelola logika bisnis, validasi request (menggunakan Zod), autentikasi, serta menjadi jembatan antara frontend dengan database dan layanan AI eksternal.
3. **Data & AI Layer**:
   - **PostgreSQL & Prisma**: Menyimpan seluruh data relasional (Produk, Dokter, Sesi, User) dan menggunakan Prisma ORM.
   - **Gemini API**: Bertugas melakukan *Embedding*, yaitu mengubah teks pertanyaan user menjadi format angka (vektor).
   - **pgvector**: Ekstensi PostgreSQL yang menyimpan data vektor dan mencocokkan kemiripan dokumen (*Cosine Similarity*).
   - **Groq API**: Menjalankan model bahasa (LLM) seperti LLaMA untuk menghasilkan jawaban akhir dari teks.

---

## 3. Cara Kerja (Flow) Chatbot AI

Berikut adalah urutan langkah (flow) yang terjadi saat seorang pasien mengirimkan pesan ke Chatbot AI:

1. **Pengiriman Pesan**: Pasien mengetik keluhan/pertanyaan di Frontend dan mengirimkannya. Frontend menembak endpoint `POST /api/chat/stream`.
2. **Pembuatan Vektor (Embedding)**: Backend menerima teks tersebut dan mengirimkannya ke **Gemini API** untuk diubah menjadi *vektor angka*.
3. **Pencarian Dokumen Relevan (Retrieval)**: Vektor angka tersebut digunakan untuk mencari dokumen *knowledge-base* (artikel medis, panduan, dll) yang paling cocok di dalam tabel database **pgvector**.
4. **Pembuatan Konteks (Augmented)**: Teks dokumen yang paling relevan (hasil pencarian) digabungkan bersama dengan riwayat percakapan sebelumnya dan pertanyaan terbaru pasien.
5. **Penghasilan Jawaban (Generation)**: Seluruh konteks tersebut dikirimkan sebagai *Prompt* ke model LLM melalui **Groq API**.
6. **Streaming Jawaban**: Groq LLM mengembalikan jawaban sedikit demi sedikit (streaming token), dan Backend meneruskannya langsung ke Frontend menggunakan koneksi SSE, sehingga pasien melihat teks yang diketik secara otomatis di layar.
7. **Analisis Latar Belakang (Asynchronous)**: Setelah jawaban selesai, Backend menjalankan proses background (menggunakan LLM ekstra) untuk menganalisis apakah percakapan tersebut mengindikasikan kondisi darurat, atau apakah sudah cukup data untuk membuat *Lead Pasien*. Jika ya, status di database akan otomatis terupdate.
