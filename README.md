# Telehealth Frontend

Frontend GlucoCare menggunakan Next.js, React, TypeScript, Tailwind CSS, dan Bun. Aplikasi mengambil katalog, data dokter, autentikasi admin, layanan konsultasi & booking, serta ekosistem AI terintegrasi dari `telehealth-backend`.

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

   Chatbot mendukung multi-key rotation (Groq key 1..N), fallback OpenRouter, dan gateway 9Router pada `.env` backend. Setelah dikonfigurasi, jalankan `bun run db:seed:knowledge` sebelum memakai fitur RAG.

5. Kembali ke frontend dan jalankan development server:

   ```bash
   cd ../telehealth-frontend
   bun run dev
   ```

Buka `http://localhost:3000` untuk aplikasi publik atau `http://localhost:3000/admin/login` untuk dashboard admin. Kredensial development mengikuti `ADMIN_EMAIL` dan `ADMIN_PASSWORD` pada file `.env` backend.

## Fitur AI & Antarmuka Cerdas GlucoCare

Frontend ini mengintegrasikan seluruh ekosistem AI terdistribusi dari backend:

### 1. Fitur AI untuk Pasien & Pengguna Publik (Public Tools)
- **AI Diabetes Daily Meal & Carb Planner (`/`)**: Generator rencana menu makan 1 hari ramah gula darah (target kalori, gram karbohidrat, urutan makan, dan teaser paket langganan GlucoCare Pro).
- **Multimodal AI Food Vision (`ChatBot.tsx`)**: Analisis visual foto makanan dan komparasi menu makanan secara langsung di chatbot.
- **RAG Conversational Health Chatbot (`ChatBot.tsx`)**: Konsultasi diabetes 24/7 dengan streaming SSE, markdown rendering, feedback rating, dan guardrails darurat.
- **Jadwal & Booking Dokter Spesialis (`components/DoctorBookingPanel.tsx`)**: Pemilihan jadwal slot online/offline langsung dari chatbot atau landing page.

### 2. Fitur AI untuk Admin & Manajemen Telehealth (Admin Portal)
- **AI Finance & Revenue Intelligence (`/admin`)**: Analisis valuasi katalog produk, proyeksi omset pipeline, dan asisten finansial interaktif.
- **AI Lead Scoring CRM & WhatsApp Outreach (`/admin/chat`)**: Skor prospek (0–100), klasifikasi tier (`HOT/WARM/COLD`), dan tautan WhatsApp 1-Klik.
- **AI Pharmacy Inventory & Restock Forecasting (`/admin/produk`)**: Pemantauan stok fisik, peramalan sisa hari stok (Runout Days), dan rekomendasi pesanan ulang (EOQ).
- **Modern Confirmation Modals**: Dialog pop-up elegan untuk konfirmasi penghapusan sesi chat admin dan reset percakapan publik.

## Integrasi Backend

Frontend menggunakan API berikut:

- katalog publik: `/api/products`, `/api/doctors`, dan `/api/doctor-categories`
- perencana makan AI: `POST /api/ai/meal-plan/generate`
- autentikasi admin: `/api/auth/login`, `/api/auth/me`, dan `/api/auth/logout`
- dashboard admin: `/api/admin/products`, `/api/admin/doctors`, serta endpoint CRUD produk dan dokter
- intelligence AI admin: `/api/ai/finance/insights`, `/api/ai/finance/query`, `/api/ai/leads/batch-scores`, `/api/ai/inventory/forecast`, `/api/ai/inventory/query`
- dashboard chat/lead: `/api/admin/chat/stats` dan `/api/admin/chat/sessions`
- chatbot: `POST /api/chat`, `POST /api/chat/stream`, `GET /api/chat`, dan `DELETE /api/chat`
- jadwal & booking: `/api/consultations/doctors/:doctorId/schedule`, `/api/consultations/bookings`, `/api/admin/consultations/stats`

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
