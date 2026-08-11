# Telehealth Backend

Backend API untuk aplikasi telehealth, dibangun menggunakan Express.js dan dijalankan dengan Bun.

## Prasyarat

Pastikan Bun sudah terpasang di komputer. Proyek ini menggunakan Bun versi `1.3.12`.

Periksa versi Bun dengan perintah berikut:

```bash
bun --version
```

## Instalasi

1. Masuk ke direktori proyek:

   ```bash
   cd telehealth-backend
   ```

2. Instal seluruh dependency menggunakan Bun:

   ```bash
   bun install
   ```

3. Salin konfigurasi environment:

   ```bash
   cp .env.example .env
   ```

4. Sesuaikan nilai di dalam `.env` jika diperlukan:

   ```env
   NODE_ENV=development
   PORT=3000
   ```

## Menjalankan Aplikasi

Jalankan server dalam mode development dengan pemantauan perubahan file:

```bash
bun run dev
```

Jalankan server tanpa mode pemantauan:

```bash
bun run start
```

Server secara default tersedia di:

```text
http://localhost:3000
```

## Memeriksa Server

Buka endpoint berikut di browser atau gunakan `curl`:

```bash
curl http://localhost:3000/health
```

Respons yang diharapkan:

```json
{
  "status": "ok",
  "environment": "development"
}
```

## Environment Variable

| Nama | Nilai bawaan | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | Environment tempat aplikasi berjalan |
| `PORT` | `3000` | Port yang digunakan server HTTP |

## Perintah yang Tersedia

| Perintah | Keterangan |
| --- | --- |
| `bun install` | Menginstal dependency berdasarkan `bun.lock` |
| `bun run dev` | Menjalankan server dalam mode development |
| `bun run start` | Menjalankan server secara normal |

> Proyek ini menggunakan Bun sebagai package manager. Jangan menjalankan `npm install` agar tidak menghasilkan `package-lock.json` atau lockfile yang berbeda.
