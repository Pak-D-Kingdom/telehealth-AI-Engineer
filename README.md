# Telehealth Frontend

Frontend GlucoCare menggunakan Next.js, React, TypeScript, Tailwind CSS, dan Bun. Aplikasi mengambil katalog, data dokter, autentikasi admin, dan layanan chatbot dari `telehealth-backend`.

## Prasyarat

Pastikan perangkat sudah memiliki:

- Bun `1.3.12` atau versi kompatibel
- Docker dan Docker Compose untuk PostgreSQL backend
- Proyek `telehealth-backend` berada satu tingkat dengan proyek ini

Periksa instalasi:

```bash
bun --version
docker --version
docker compose version
```

## Instalasi

1. Masuk ke direktori frontend dan instal dependency:

   ```bash
   cd telehealth-frontend
   bun install
   ```

2. Buat environment lokal dari contoh:

   ```bash
   cp .env.example .env.local
   ```

3. Pastikan alamat backend di `.env.local` sesuai:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

4. Siapkan backend dan PostgreSQL pada terminal terpisah:

   ```bash
   cd ../telehealth-backend
   bun install
   cp .env.example .env
   bun run db:up
   bun run db:deploy
   bun run db:seed
   bun run dev
   ```

   Chatbot membutuhkan endpoint, API key, serta model chat/embedding 9Router pada `.env`
   backend. Setelah dikonfigurasi, jalankan `bun run db:seed:knowledge` sebelum memakai fitur RAG.

5. Kembali ke frontend dan jalankan development server:

   ```bash
   cd ../telehealth-frontend
   bun run dev
   ```

Buka `http://localhost:3000` untuk aplikasi publik atau `http://localhost:3000/admin/login` untuk dashboard admin. Kredensial development mengikuti `ADMIN_EMAIL` dan `ADMIN_PASSWORD` pada file `.env` backend.

## Integrasi Backend

Frontend menggunakan API berikut:

- katalog publik: `/api/products`, `/api/doctors`, dan `/api/doctor-categories`
- autentikasi admin: `/api/auth/login`, `/api/auth/me`, dan `/api/auth/logout`
- dashboard admin: `/api/admin/products`, `/api/admin/doctors`, serta endpoint CRUD produk dan dokter
- dashboard chat/lead: `/api/admin/chat/stats` dan `/api/admin/chat/sessions`
- chatbot: `POST /api/chat`, `GET /api/chat`, dan `DELETE /api/chat`

Request autentikasi admin dan chatbot memakai cookie HTTP-only serta `credentials: "include"`. Karena itu, nilai `FRONTEND_URL` pada backend harus sama dengan origin frontend, secara default `http://localhost:3000`.

Widget chat memulihkan histori dari backend ketika dibuka, mengirim pesan langsung ke API,
menampilkan respons darurat yang ditandai backend, serta menyediakan feedback membantu/tidak
membantu untuk setiap jawaban yang sudah tersimpan. Tidak ada respons medis berbasis kata
kunci atau data percakapan palsu di frontend.

Admin dapat membuka `/admin/chat` untuk mencari session, memfilter emergency/lead/status,
membaca histori, menyelesaikan session, memberikan status kualifikasi lead, serta meninjau
model, latency, fallback, kualitas retrieval, intent, dan feedback setiap jawaban.

## Pemeriksaan Kode

Jalankan sebelum membuat commit:

```bash
bun run lint
bun run typecheck
bun run build
```

Untuk menjalankan hasil production build:

```bash
bun run start
```

## Perintah yang Tersedia

| Perintah | Keterangan |
| --- | --- |
| `bun install` | Menginstal dependency berdasarkan `bun.lock` |
| `bun run dev` | Menjalankan Next.js dalam mode development |
| `bun run lint` | Memeriksa aturan ESLint |
| `bun run typecheck` | Memeriksa tipe TypeScript |
| `bun run build` | Membuat production build |
| `bun run start` | Menjalankan production build |

> Proyek ini menggunakan Bun. Jangan menjalankan `npm install` agar tidak menghasilkan `package-lock.json` atau lockfile lain.
