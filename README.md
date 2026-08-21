# Telehealth Backend

Backend API untuk aplikasi telehealth menggunakan Express.js, Bun, PostgreSQL, dan Prisma ORM.

## Teknologi

- Bun `1.3.14`
- Express.js `5`
- TypeScript
- PostgreSQL `17` melalui Docker
- Prisma ORM `7`
- Groq AI SDK (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `llama-3.2-11b-vision-preview`)
- Google Gemini Embedding (`gemini-embedding-001`)

## Ekosistem AI Agents & Clinical Intelligence Engine

Sistem backend ini dilengkapi dengan arsitektur Multi-Agent AI terdistribusi yang terbagi menjadi dua ranah utama: **Fitur AI untuk Pengguna/Pasien (Public User)** dan **Fitur AI untuk Admin & Manajemen Telehealth (Admin Portal)**.

### 1. Fitur AI untuk Pasien & Pengguna Publik

| Status | AI Agent / Modul | Deskripsi & Kemampuan Utama | Integrasi / Endpoint |
| :---: | :--- | :--- | :--- |
| ✅ | **Master Router & Intent Dispatcher** | Mengklasifikasikan intensi pengguna secara real-time dan mengarahkan pesan ke agent spesifik (`EDUCATION`, `TRIAGE`, atau `VISION`). | Internal Multi-Agent Router (`router.agent.ts`) |
| ✅ | **AI Diabetes Education & RAG Assistant** | Edukasi diabetes berbasis RAG (*Retrieval-Augmented Generation*), skrining bertahap natural, rekomendasi produk, dan rujukan dokter spesialis. | `POST /api/chat`<br>`POST /api/chat/stream` |
| ✅ | **AI Clinical Triage & SBAR Generator** | Evaluasi tingkat keparahan keluhan medis (*Emergency, Urgent, Non-Urgent*) dan penyusunan ringkasan medis terstruktur format SBAR (*Situation, Background, Assessment, Recommendation*). | `POST /api/chat` (Triage Mode) |
| ✅ | **AI Food Vision & Nutrition Comparison** | Analisis visual foto makanan (estimasi karbohidrat, protein, kalori, dampak glikemik) dan komparasi 2 foto menu makanan untuk diabetes. | `POST /api/chat` (Vision Mode) |
| ✅ | **AI Diabetes Daily Meal & Carb Planner** | Rencana menu makan 1 hari ramah glukosa darah berbasis pangan lokal Nusantara (target kalori, gram karbo, tips memasak, food sequencing, teaser Pro). | `POST /api/ai/meal-plan/generate` |
| ✅ | **AI Glucose Trends & HbA1c Estimator** | Menganalisis log glukosa harian, mendeteksi episode hipoglikemia, spike gula darah, dan menghitung estimasi HbA1c secara klinis. | `POST /api/ai/glucose/trends` |
| ✅ | **FINDRISC Diabetes Risk Calculator** | Kalkulator risiko diabetes tipe 2 standar internasional (skor 0–26) dengan estimasi probabilitas 10 tahun dan rencana pencegahan. | `POST /api/ai/risk/findrisc` |
| ✅ | **Drug Interaction Checker** | Memeriksa potensi interaksi berbahaya antara obat diabetes, obat komorbiditas (NSAID, antihipertensi), dan alkohol. | `POST /api/ai/medications/interactions` |
| ✅ | **Contraindication Checker** | Mendeteksi kontraindikasi obat terhadap kondisi khusus pasien (gangguan ginjal berat eGFR, kehamilan, peringatan lansia). | `POST /api/ai/medications/contraindications` |
| ✅ | **Medical Safety Guardrails** | Proteksi keamanan berlapis: deteksi kegawatdaruratan (119/IGD), proteksi *self-harm*, blokir *prompt injection/jailbreak*, dan penyaringan klaim medis palsu. | `guardrails.service.ts` |

---

### 2. Fitur AI untuk Admin & Manajemen Telehealth

| Status | AI Agent / Modul | Deskripsi & Kemampuan Utama | Integrasi / Endpoint |
| :---: | :--- | :--- | :--- |
| ✅ | **AI Finance & Revenue Intelligence** | Menghitung total valuasi katalog produk, menganalisis potensi omset *Sales Pipeline* berbasis pasien aktif, menyajikan ringkasan eksekutif, dan penasihat finansial bisnis interaktif. | `GET /api/ai/finance/insights`<br>`POST /api/ai/finance/query` |
| ✅ | **AI Lead Scoring CRM & WhatsApp Outreach** | Mengevaluasi prospek pasien dengan skor 0–100 (4 pilar), klasifikasi tier (`HOT 🔥`, `WARM ⚡`, `COLD ❄️`), dan pembuatan draf pesan WhatsApp personalisasi 1-klik. | `GET /api/ai/leads/batch-scores` |
| ✅ | **AI Pharmacy Inventory & Restock Forecasting** | Membaca stok fisik riil di gudang, menganalisis laju permintaan pasien (*Demand Velocity*), memproyeksikan sisa hari ketersediaan (*Runout Days*), menghitung kuantitas pemesanan optimal (*EOQ Buffer 30 Hari*), dan asisten tanya-jawab pengadaan barang. | `GET /api/ai/inventory/forecast`<br>`POST /api/ai/inventory/query` |

---

## Prasyarat

Pastikan Bun dan Docker sudah tersedia:

```bash
bun --version
docker --version
docker compose version
```

## Instalasi

1. Masuk ke direktori proyek:

   ```bash
   cd telehealth-backend
   ```

2. Instal dependency menggunakan Bun:

   ```bash
   bun install
   ```

3. Salin konfigurasi environment:

   ```bash
   cp .env.example .env
   ```

4. Jalankan PostgreSQL di Docker:

   ```bash
   bun run db:up
   ```

5. Validasi schema dan generate Prisma Client:

   ```bash
   bun run db:validate
   bun run db:generate
   ```

6. Terapkan migration dan isi data awal:

   ```bash
   bun run db:deploy
   bun run db:seed
   ```

7. Jalankan backend:

   ```bash
   bun run dev
   ```

Backend tersedia di `http://localhost:4000`.

## Memeriksa Koneksi

Endpoint health juga memeriksa koneksi PostgreSQL:

```bash
curl http://localhost:4000/health
```

Respons ketika API dan database siap:

```json
{
  "status": "ok",
  "environment": "development",
  "database": "connected"
}
```

## Konfigurasi Environment

| Nama                | Nilai development            | Keterangan                                      |
| ------------------- | ---------------------------- | ----------------------------------------------- |
| `NODE_ENV`          | `development`                | Environment aplikasi                            |
| `PORT`              | `4000`                       | Port backend API                                |
| `POSTGRES_DB`       | `telehealth`                 | Nama database PostgreSQL                        |
| `POSTGRES_USER`     | `telehealth`                 | Pengguna PostgreSQL                             |
| `POSTGRES_PASSWORD` | `telehealth_dev_password`    | Password lokal PostgreSQL                       |
| `POSTGRES_PORT`     | `5434`                       | Port PostgreSQL pada host                       |
| `DATABASE_URL`      | `postgresql://...`           | URL koneksi yang digunakan Prisma               |
| `FRONTEND_URL`      | `http://localhost:3000`      | Origin frontend yang diizinkan oleh CORS        |
| `SESSION_TTL_DAYS`  | `7`                          | Masa berlaku session admin dalam hari           |
| `CHAT_SESSION_TTL_DAYS` | `30`                     | Masa berlaku session chatbot dalam hari         |
| `GROQ_API_KEY`      | -                            | API key Groq untuk jawaban dan ekstraksi lead   |
| `GROQ_CHAT_MODEL`   | `llama-3.3-70b-versatile`    | Model utama chatbot                             |
| `GROQ_EXTRACTION_MODEL` | `llama-3.1-8b-instant` | Model ekstraksi data lead                       |
| `GEMINI_API_KEY`    | -                            | API key Gemini untuk embedding knowledge base   |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Model embedding knowledge base                  |
| `AI_REQUEST_TIMEOUT_MS` | `30000`                  | Batas waktu request provider AI                 |
| `ADMIN_NAME`        | `Telehealth Admin`           | Nama admin yang dibuat oleh seed                |
| `ADMIN_EMAIL`       | `admin@glucocare.id`         | Email login admin development                   |
| `ADMIN_PASSWORD`    | `change-this-local-password` | Password admin development, minimal 12 karakter |

Port database menggunakan `5434` agar tidak bentrok dengan instalasi PostgreSQL lokal yang biasanya memakai `5432`. Di dalam container, PostgreSQL tetap menggunakan port `5432`.

> Kredensial contoh hanya untuk development lokal. Gunakan secret yang kuat dan jangan commit `.env` untuk staging atau production.

## Prisma

Schema Prisma berada di `prisma/schema.prisma` dan migration berada di `prisma/migrations`. Model awal meliputi:

- User dan session admin
- Produk
- Dokter
- Kategori dokter
- Relasi dokter dan kategori
- Session, pesan, dan lead chatbot
- Knowledge base dengan embedding pgvector

Setelah menambahkan atau mengubah model, buat migration dengan:

```bash
bun run db:migrate -- --name nama_migration
```

Untuk menjalankan migration yang sudah ada pada staging atau production:

```bash
bun run db:deploy
```

Buka Prisma Studio untuk melihat data:

```bash
bun run db:studio
```

Seed bersifat idempotent dan dapat dijalankan kembali. Seed akan memperbarui akun admin berdasarkan environment serta membuat data awal produk, dokter demo, dan kategori:

```bash
bun run db:seed
```

Data dokter dari seed adalah data demo dan bukan identitas tenaga medis yang telah diverifikasi.

## Autentikasi Admin

Backend menggunakan session cookie HTTP-only. Password disimpan sebagai hash Argon2id dan token session hanya disimpan dalam bentuk hash SHA-256 di database.

Login dan simpan cookie menggunakan `curl`:

```bash
curl -i \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@glucocare.id","password":"change-this-local-password"}' \
  http://localhost:4000/api/auth/login
```

Periksa session:

```bash
curl -b cookies.txt http://localhost:4000/api/auth/me
```

Logout:

```bash
curl -X POST -b cookies.txt http://localhost:4000/api/auth/logout
```

Frontend harus mengirim request autentikasi dengan opsi `credentials: "include"`.

## Endpoint API

Endpoint publik:

| Method | Endpoint                    | Keterangan                               |
| ------ | --------------------------- | ---------------------------------------- |
| `GET`  | `/health`                   | Status API dan koneksi database          |
| `GET`  | `/api/products`             | Daftar produk aktif                      |
| `GET`  | `/api/products/:identifier` | Detail produk berdasarkan UUID atau slug |
| `GET`  | `/api/doctors`              | Daftar dokter aktif                      |
| `GET`  | `/api/doctors/:identifier`  | Detail dokter berdasarkan UUID atau slug |
| `GET`  | `/api/doctor-categories`    | Daftar kategori dokter                   |

Endpoint chatbot publik (menggunakan cookie session HTTP-only):

| Method   | Endpoint                 | Keterangan                                      |
| -------- | ------------------------ | ----------------------------------------------- |
| `GET`    | `/api/chat`              | Riwayat percakapan aktif beserta sumber jawaban |
| `POST`   | `/api/chat`              | Mengirim pesan dengan respons JSON              |
| `POST`   | `/api/chat/stream`       | Mengirim pesan dengan respons SSE streaming     |
| `POST`   | `/api/chat/retry`        | Mencoba ulang pesan terakhir via JSON            |
| `POST`   | `/api/chat/retry/stream` | Mencoba ulang pesan terakhir via SSE             |
| `GET`    | `/api/chat/status`       | Status provider dan jeda pemulihan kuota        |
| `DELETE` | `/api/chat`              | Menutup session untuk percakapan baru            |

Event SSE yang dikirim adalah `meta`, `token`, `done`, atau `error`. Event `meta` dan `done`
menyertakan referensi knowledge base yang digunakan.

Endpoint autentikasi:

| Method | Endpoint           | Keterangan                             |
| ------ | ------------------ | -------------------------------------- |
| `POST` | `/api/auth/login`  | Login admin dan membuat session cookie |
| `POST` | `/api/auth/logout` | Menghapus session                      |
| `GET`  | `/api/auth/me`     | Mengambil admin yang sedang login      |

Endpoint admin yang membutuhkan session:

| Method   | Endpoint              | Keterangan                              |
| -------- | --------------------- | --------------------------------------- |
| `GET`    | `/api/admin/products` | Daftar seluruh produk termasuk nonaktif |
| `POST`   | `/api/products`       | Membuat produk                          |
| `PATCH`  | `/api/products/:id`   | Memperbarui produk                      |
| `DELETE` | `/api/products/:id`   | Menghapus produk                        |
| `GET`    | `/api/admin/doctors`  | Daftar seluruh dokter termasuk nonaktif |
| `POST`   | `/api/doctors`        | Membuat dokter                          |
| `PATCH`  | `/api/doctors/:id`    | Memperbarui dokter                      |
| `DELETE` | `/api/doctors/:id`    | Menghapus dokter                        |

Endpoint AI Clinical Tools & Admin Intelligence:

| Method | Endpoint                              | Keterangan                                              |
| ------ | ------------------------------------- | ------------------------------------------------------- |
| `POST` | `/api/ai/glucose/trends`              | Analisis tren gula darah, spike, dan estimasi HbA1c     |
| `POST` | `/api/ai/risk/findrisc`               | Kalkulasi skor risiko diabetes FINDRISC                 |
| `POST` | `/api/ai/medications/interactions`    | Cek interaksi obat diabetes & komorbiditas             |
| `POST` | `/api/ai/medications/contraindications` | Cek kontraindikasi klinis (ginjal, lansia, kehamilan)   |
| `GET`  | `/api/ai/finance/insights`            | Ringkasan metrik finansial & valuasi pipeline admin     |
| `POST` | `/api/ai/finance/query`               | Tanya jawab interaktif dengan AI Finance Advisor        |
| `GET`  | `/api/ai/leads/batch-scores`          | Batch Lead Scoring (HOT/WARM/COLD) & draf WhatsApp CRM  |
| `GET`  | `/api/ai/inventory/forecast`          | Peramalan stok obat/alat, runout days, dan saran EOQ    |
| `POST` | `/api/ai/inventory/query`             | Tanya jawab interaktif dengan AI Procurement Advisor    |

Endpoint daftar mendukung `page`, `limit`, dan `search`. Produk mendukung filter `category`, sedangkan dokter mendukung `categoryId`. Endpoint admin juga mendukung `active=true` atau `active=false`.

## Pengujian

Pastikan PostgreSQL aktif, migration sudah diterapkan, dan seed sudah dijalankan. Kemudian jalankan:

```bash
bun run typecheck
bun run test
```

Integration test memeriksa health check, data publik, proteksi route admin, login gagal, login berhasil, CRUD produk/dokter, dan logout. Data sementara test dibersihkan setelah pengujian.

## Perintah yang Tersedia

| Perintah | Keterangan |
| --- | --- |
| `bun install` | Menginstal dependency dan generate Prisma Client |
| `bun run dev` | Menjalankan server dengan watch mode |
| `bun run start` | Menjalankan server secara normal |
| `bun run typecheck` | Memeriksa TypeScript tanpa menghasilkan file build |
| `bun run db:up` | Menyalakan PostgreSQL dan menunggu sampai sehat |
| `bun run db:down` | Menghentikan container PostgreSQL |
| `bun run db:logs` | Melihat log PostgreSQL |
| `bun run db:validate` | Memvalidasi schema Prisma |
| `bun run db:generate` | Menghasilkan Prisma Client |
| `bun run db:migrate -- --name ...` | Membuat dan menjalankan migration development |
| `bun run db:deploy` | Menjalankan migration untuk deployment |
| `bun run db:seed` | Mengisi atau memperbarui data awal |
| `bun run db:studio` | Membuka Prisma Studio |
| `bun run test` | Menjalankan integration test API |

> Proyek ini menggunakan Bun sebagai package manager. Jangan menjalankan `npm install` agar tidak membuat lockfile lain.
