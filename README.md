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

6. Jalankan backend:

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

Port database menggunakan `5434` agar tidak bentrok dengan instalasi PostgreSQL lokal yang biasanya memakai `5432`. Di dalam container, PostgreSQL tetap menggunakan port `5432`.

> Kredensial contoh hanya untuk development lokal. Gunakan secret yang kuat dan jangan commit `.env` untuk staging atau production.

## Prisma

Schema Prisma berada di `prisma/schema.prisma`. Schema awal belum berisi model bisnis agar struktur tabel dapat dirancang sesuai kebutuhan frontend sebelum migration pertama dibuat.

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
| `bun run db:studio` | Membuka Prisma Studio |

> Proyek ini menggunakan Bun sebagai package manager. Jangan menjalankan `npm install` agar tidak membuat lockfile lain.
