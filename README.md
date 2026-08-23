# Telehealth Backend

Backend API untuk aplikasi telehealth menggunakan Express.js, Bun, PostgreSQL, dan Prisma ORM.

## Teknologi

- Bun `1.3.12`
- Express.js `5`
- TypeScript
- PostgreSQL `17` melalui Docker
- Prisma ORM `7`

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
| `AI_GATEWAY_BASE_URL` | `https://9router.sincan.dev/v1` | Endpoint OpenAI-compatible 9Router           |
| `AI_GATEWAY_API_KEY` | -                           | API key yang dibuat pada dashboard 9Router      |
| `AI_CHAT_MODEL`     | -                             | Model 9Router untuk jawaban chatbot             |
| `AI_CHAT_FALLBACK_MODELS` | -                    | Daftar model fallback dipisahkan koma            |
| `AI_EXTRACTION_MODEL` | mengikuti `AI_CHAT_MODEL`  | Model 9Router untuk ekstraksi data lead          |
| `AI_EMBEDDING_MODEL` | -                           | Model 9Router untuk embedding knowledge base    |
| `AI_REQUEST_TIMEOUT_MS` | `30000`                  | Batas waktu request provider AI                 |
| `ADMIN_NAME`        | `Telehealth Admin`           | Nama admin yang dibuat oleh seed                |
| `ADMIN_EMAIL`       | `admin@glucocare.id`         | Email login admin development                   |
| `ADMIN_PASSWORD`    | `change-this-local-password` | Password admin development, minimal 12 karakter |

Port database menggunakan `5434` agar tidak bentrok dengan instalasi PostgreSQL lokal yang biasanya memakai `5432`. Di dalam container, PostgreSQL tetap menggunakan port `5432`.

> Kredensial contoh hanya untuk development lokal. Gunakan secret yang kuat dan jangan commit `.env` untuk staging atau production.

Semua trafik AI melewati satu gateway 9Router. Backend tidak lagi menyimpan API key
provider upstream seperti Groq, Gemini, atau OpenAI. Ambil model ID yang tersedia dari
endpoint `GET /models` milik 9Router. Model embedding memiliki katalog terpisah pada
`GET /models/embedding`; jangan menggunakan alias combo/chat sebagai model embedding.
Chat mencoba ulang error jaringan/5xx satu kali per model, lalu berpindah ke fallback.
Health state dicatat terpisah per model dan model yang berhasil dipakai disimpan pada pesan.

Model embedding harus menghasilkan tepat 3072 dimensi agar kompatibel dengan kolom
`vector(3072)`. Setelah mengganti model embedding, jalankan kembali
`bun run db:seed:knowledge` supaya seluruh dokumen dan query memakai ruang embedding yang sama.

Setelah mengisi API key dan model ID, verifikasi koneksi, daftar model, chat, dan embedding:

```bash
bun run test:ai-gateway
```

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

Seed bersifat idempotent dan dapat dijalankan kembali. Seed akan memperbarui akun admin berdasarkan environment serta membuat 14 produk, 12 dokter demo, dan 4 kategori layanan dengan format yang disesuaikan untuk konteks Indonesia:

```bash
bun run db:seed
```

Data dokter, nomor registrasi, produk, dan harga dari seed adalah data demo. Seluruhnya bukan identitas tenaga medis, izin edar, katalog, atau harga pasar yang telah diverifikasi.

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
| `POST`   | `/api/chat/messages/:messageId/feedback` | Menyimpan feedback jawaban AI      |
| `GET`    | `/api/chat/status`       | Status provider dan jeda pemulihan kuota        |
| `DELETE` | `/api/chat`              | Menutup session untuk percakapan baru            |

Event SSE yang dikirim adalah `meta`, `token`, `done`, atau `error`. Event `meta` dan `done`
menyertakan referensi knowledge base yang digunakan. Untuk permintaan rekomendasi obat,
produk, atau dokter dalam domain diabetes, respons juga dapat memuat `relatedCare` berisi
produk dan profil dokter aktif yang cocok secara topik. Metadata ini disimpan bersama pesan
agar kartu yang sama dapat dipulihkan dari histori dan ditinjau admin.

`relatedCare` adalah pencocokan katalog deterministik, bukan output bebas model AI. Produk
resep diberi peringatan khusus dan seluruh pilihan disertai disclaimer bahwa diagnosis,
dosis, interaksi, serta kecocokan terapi harus dinilai tenaga medis. Kondisi darurat tidak
pernah menampilkan pilihan katalog.

Request ke endpoint kirim dan retry (`POST /api/chat`, `POST /api/chat/stream`,
`POST /api/chat/retry`, serta `POST /api/chat/retry/stream`) wajib menyertakan
`consentToDataProcessing: true`. Waktu dan versi consent dicatat pada session sebelum pesan
atau data lead disimpan. Pada retry session lama, consent eksplisit ini juga memperbarui session
yang belum memiliki catatan consent. UI menjelaskan bahwa pemrosesan AI melewati gateway pihak
ketiga. Nomor WhatsApp lead dinormalisasi ke format `+62` dan divalidasi.

Setiap jawaban asisten menyimpan quality telemetry: intent, total latency, latency gateway,
jumlah attempt, penggunaan fallback, status RAG, latency retrieval, jumlah referensi, serta
top similarity. Pengguna dapat memberi rating `HELPFUL` atau `NOT_HELPFUL`; rating negatif
wajib menyertakan alasan. Feedback hanya dapat diberikan pada pesan asisten yang dimiliki
session cookie aktif. Ringkasan feedback dan telemetry tersedia pada dashboard admin chat.

Dataset regresi pada `data/evaluation/chat-cases.json` memuat 60 kasus Bahasa Indonesia.
Mode offline memeriksa emergency, intent, dan pemicu katalog tanpa memanggil provider:

```bash
bun run test:eval
```

Live evaluation memanggil 9Router. Batasi kasus atau bandingkan beberapa model dengan
`EVAL_LIMIT`, `EVAL_CATEGORY`, dan `EVAL_MODELS`:

```bash
EVAL_LIMIT=10 EVAL_MODELS=model-a,model-b bun run test:eval:live
```

Live evaluation dapat memakai kuota provider dan sengaja keluar dengan status gagal ketika
sebuah model tidak memenuhi guardrail atau kriteria jawaban.

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
| `bun run db:seed:knowledge` | Membuat ulang embedding knowledge base melalui 9Router |
| `bun run db:studio` | Membuka Prisma Studio |
| `bun run test` | Menjalankan integration test API |
| `bun run test:eval` | Menjalankan 60 kasus evaluasi deterministik tanpa provider |
| `bun run test:eval:live` | Menilai jawaban model 9Router dengan evaluation dataset |
| `bun run test:ai-gateway` | Memeriksa koneksi, model, chat, dan embedding 9Router |
| `bun run test:e2e:chat` | Menjalankan pengujian chatbot end-to-end |

> Proyek ini menggunakan Bun sebagai package manager. Jangan menjalankan `npm install` agar tidak membuat lockfile lain.
