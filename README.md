# Telehealth Frontend

Frontend GlucoCare menggunakan Next.js, React, TypeScript, Tailwind CSS, dan Bun. Aplikasi mengambil katalog produk dan dokter dari `telehealth-backend`, serta menyediakan dashboard admin dengan autentikasi session cookie.

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

Request autentikasi memakai cookie HTTP-only dan `credentials: "include"`. Karena itu, nilai `FRONTEND_URL` pada backend harus sama dengan origin frontend, secara default `http://localhost:3000`.

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
