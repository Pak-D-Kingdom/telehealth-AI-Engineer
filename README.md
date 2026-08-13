# Telehealth Backend

Backend API utama GlucoCare untuk katalog, dashboard admin, dan chatbot telehealth. Aplikasi menggunakan Express.js, Bun, PostgreSQL/pgvector, dan Prisma ORM.

## Teknologi

- Bun `1.3.12`
- Express.js `5`
- TypeScript
- PostgreSQL `17` + pgvector melalui Docker
- Prisma ORM `7`
- Groq Chat Completions dan Google Gemini Embeddings

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

7. Untuk mengaktifkan chatbot, isi `GROQ_API_KEY` dan `GEMINI_API_KEY` di `.env`, kemudian buat embedding knowledge base:

   ```bash
   bun run db:seed:knowledge
   ```

8. Jalankan backend:

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

| Nama | Nilai development | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | Environment aplikasi |
| `PORT` | `4000` | Port backend API |
| `POSTGRES_DB` | `telehealth` | Nama database PostgreSQL |
| `POSTGRES_USER` | `telehealth` | Pengguna PostgreSQL |
| `POSTGRES_PASSWORD` | `telehealth_dev_password` | Password lokal PostgreSQL |
| `POSTGRES_PORT` | `5434` | Port PostgreSQL pada host |
| `DATABASE_URL` | `postgresql://...` | URL koneksi yang digunakan Prisma |
| `FRONTEND_URL` | `http://localhost:3000` | Origin frontend yang diizinkan oleh CORS |
| `SESSION_TTL_DAYS` | `7` | Masa berlaku session admin dalam hari |
| `CHAT_SESSION_TTL_DAYS` | `30` | Masa berlaku session chatbot dalam hari |
| `ADMIN_NAME` | `Telehealth Admin` | Nama admin yang dibuat oleh seed |
| `ADMIN_EMAIL` | `admin@glucocare.id` | Email login admin development |
| `ADMIN_PASSWORD` | `change-this-local-password` | Password admin development, minimal 12 karakter |
| `GROQ_API_KEY` | kosong | API key untuk respons percakapan chatbot |
| `GROQ_CHAT_MODEL` | `llama-3.3-70b-versatile` | Model chat Groq |
| `GROQ_EXTRACTION_MODEL` | `llama-3.1-8b-instant` | Model ringan untuk ekstraksi lead JSON |
| `GEMINI_API_KEY` | kosong | API key untuk embedding knowledge base dan pencarian RAG |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Model embedding Gemini |
| `AI_REQUEST_TIMEOUT_MS` | `30000` | Batas waktu request provider AI dalam milidetik |

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
- Knowledge base dengan embedding vector

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

Knowledge base chatbot bersumber dari dokumen di `data/knowledge-base`. Seed ini membutuhkan `GEMINI_API_KEY`, bersifat idempotent, dan dapat dijalankan kembali setelah dokumen diubah:

```bash
bun run db:seed:knowledge
```

Jika seed gagal dengan `GEMINI_AUTH_ERROR` dan alasan `ACCESS_TOKEN_TYPE_UNSUPPORTED`, key sudah terbaca tetapi ditolak oleh Gemini. Periksa bahwa key berstatus aktif dan terikat ke project/service account yang benar pada Google AI Studio, lalu buat key pengganti jika perlu. Backend tidak akan menampilkan atau menyimpan nilai key pada log.

## Chatbot

Fungsi dari proyek `telehealth-chatbot` telah dikonsolidasikan ke backend ini. Percakapan, lead, dan knowledge base sekarang disimpan di PostgreSQL sehingga `telehealth-backend` menjadi satu-satunya source of truth untuk sisi backend.

Chatbot menggunakan cookie HTTP-only `telehealth_chat_session`. Frontend tidak menyimpan token session di JavaScript dan harus mengirim request dengan `credentials: "include"`. Sistem juga memiliki validasi input, rate limit, histori terbatas untuk model, pemeriksaan frasa darurat, guardrail informasi medis, serta fallback ketika pencarian RAG tidak tersedia.

API key tidak boleh diambil dari `.env` repository chatbot lama. Jika key pernah masuk ke Git, cabut atau rotasi key tersebut lalu gunakan key baru hanya melalui environment deployment atau `.env` lokal yang tidak di-commit.

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

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/health` | Status API dan koneksi database |
| `GET` | `/api/products` | Daftar produk aktif |
| `GET` | `/api/products/:identifier` | Detail produk berdasarkan UUID atau slug |
| `GET` | `/api/doctors` | Daftar dokter aktif |
| `GET` | `/api/doctors/:identifier` | Detail dokter berdasarkan UUID atau slug |
| `GET` | `/api/doctor-categories` | Daftar kategori dokter |

Endpoint autentikasi:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login admin dan membuat session cookie |
| `POST` | `/api/auth/logout` | Menghapus session |
| `GET` | `/api/auth/me` | Mengambil admin yang sedang login |

Endpoint chatbot:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/api/chat` | Mengirim pesan dan membuat/melanjutkan session |
| `GET` | `/api/chat` | Mengambil histori session dari cookie saat ini |
| `GET` | `/api/chat/:sessionId` | Mengambil histori hanya jika ID cocok dengan cookie session |
| `DELETE` | `/api/chat` | Mengakhiri session dan menghapus cookie browser |

Endpoint admin yang membutuhkan session:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/admin/products` | Daftar seluruh produk termasuk nonaktif |
| `POST` | `/api/products` | Membuat produk |
| `PATCH` | `/api/products/:id` | Memperbarui produk |
| `DELETE` | `/api/products/:id` | Menghapus produk |
| `GET` | `/api/admin/doctors` | Daftar seluruh dokter termasuk nonaktif |
| `POST` | `/api/doctors` | Membuat dokter |
| `PATCH` | `/api/doctors/:id` | Memperbarui dokter |
| `DELETE` | `/api/doctors/:id` | Menghapus dokter |
| `GET` | `/api/admin/chat/stats` | Statistik session, lead, dan kondisi darurat |
| `GET` | `/api/admin/chat/sessions` | Daftar session chatbot dengan filter dan pencarian |
| `GET` | `/api/admin/chat/sessions/:id` | Detail histori dan lead suatu session |
| `PATCH` | `/api/admin/chat/sessions/:id` | Memperbarui status session atau kualifikasi lead |

Endpoint daftar mendukung `page`, `limit`, dan `search`. Produk mendukung filter `category`, sedangkan dokter mendukung `categoryId`. Endpoint admin produk/dokter juga mendukung `active=true` atau `active=false`. Daftar chat mendukung filter `status`, `emergency`, dan `leadCaptured`.

## Pengujian

Pastikan PostgreSQL aktif, migration sudah diterapkan, dan seed sudah dijalankan. Kemudian jalankan:

```bash
bun run typecheck
bun run test
```

Test memeriksa health check, data publik, proteksi route admin, login, CRUD produk/dokter, session chatbot, kondisi darurat, proteksi histori, ekstraksi lead, dan logout. Data sementara test dibersihkan setelah pengujian. Test chatbot tidak mengirim request ke provider AI eksternal.

Setelah API key dan knowledge base siap, jalankan smoke-test end-to-end dengan provider AI nyata:

```bash
bun run test:e2e:chat
```

Smoke-test memeriksa pencarian RAG, jawaban HbA1c, penolakan dosis, prompt injection, emergency, histori cookie, dan ekstraksi lead. Semua session serta data dummy yang dibuat oleh test akan dihapus kembali. Perintah ini menggunakan kuota Groq dan Gemini; jika Groq mengembalikan `AI_RATE_LIMITED`, tunggu sesuai nilai `Retry-After` sebelum mengulang.

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
| `bun run db:seed:knowledge` | Membuat embedding dan memperbarui knowledge base chatbot |
| `bun run db:studio` | Membuka Prisma Studio |
| `bun run test` | Menjalankan integration test API |
| `bun run test:e2e:chat` | Menjalankan smoke-test chatbot dengan provider AI nyata |

> Proyek ini menggunakan Bun sebagai package manager. Jangan menjalankan `npm install` agar tidak membuat lockfile lain.
