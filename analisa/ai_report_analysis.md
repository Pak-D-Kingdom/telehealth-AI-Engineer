# Analisis Arsitektur AI Report & Database Analytics (GlucoCare)

Fitur **AI Report & Database Intelligence** pada GlucoCare adalah sistem analitik berbasis **Text-to-SQL** dan **Data Synthesis** yang memungkinkan administrator menanyakan metrik bisnis, tren operasional, demografi pasien, hingga performa produk dalam bahasa alami (*Natural Language Query*). Sistem ini menerjemahkan pertanyaan menjadi query SQL yang aman, mengeksekusinya ke database PostgreSQL, lalu menyajikan grafik interaktif, tabel data, serta rekomendasi strategis secara otomatis.

---

## 1. Arsitektur & Teknologi Inti

Sistem ini dibangun dengan arsitektur modular yang menggabungkan beberapa komponen utama:

1. **LLM Inference Engine (Groq / OpenRouter API)**:
   - **Step 1 (Text-to-SQL Extraction)**: Menggunakan model ekstraksi untuk menerjemahkan pertanyaan admin menjadi klausa `SELECT` PostgreSQL yang efisien dan teragregasi.
   - **Step 2 (Report Data Synthesis)**: Menggunakan model penalaran untuk menganalisis data mentah hasil query, memilih tipe visualisasi yang paling tepat, menyusun *takeaways*, serta merumuskan rekomendasi aksi.
2. **Database Engine (PostgreSQL + Prisma ORM)**:
   - Melakukan eksekusi query raw agregasi secara aman menggunakan `prisma.$queryRawUnsafe` dengan sanitasi tipe data (`BigInt`, `Date`).
3. **Security Guardrails (Read-Only Enforcement)**:
   - Memastikan query yang dihasilkan hanya bersifat pembacaan data (`SELECT`) dan menolak semua instruksi DDL/DML berbahaya (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`).
4. **Resilient Fallback Engine**:
   - Sistem dilengkapi generator cadangan berbasis kata kunci (*keyword heuristics*) jika terjadi gangguan koneksi ke LLM eksternal.

---

## 2. Alur Kerja Sistem (2-Step Pipeline)

```text
[ ADMIN (Frontend) ]
        │
        │ 1. POST /api/admin/report/query { query }
        ▼
[ Express Controller & Middleware ]
        │
        │ 2. Validasi Admin Session (requireAuth)
        ▼
[ Admin Report Service ]
        │
        ├───────► Step 1: Text-to-SQL Extraction
        │         • Kirim prompt skema + pertanyaan ke LLM (Groq / OpenRouter)
        │         • LLM menghasilkan SQL agregasi (SELECT) & petunjuk grafik
        │         ◄────────────────────────────────────────────────────────┘
        │
        ├───────► Step 2: Safe Database Query Execution
        │         • Regex Guardrail: Cek kata kunci terlarang (DROP, INSERT, dll)
        │         • Eksekusi ke PostgreSQL via Prisma ($queryRawUnsafe)
        │         • Serialisasi data (konversi BigInt -> Number, Date -> ISOString)
        │         ◄────────────────────────────────────────────────────────┘
        │
        ├───────► Step 3: Data Synthesis & Visual Recommendation
        │         • Kirim raw data hasil query + synthesis prompt ke LLM
        │         • LLM merumuskan: Judul, Summary, ChartData/Table, Takeaways, Rekomendasi
        │         ◄────────────────────────────────────────────────────────┘
        ▼
[ Response JSON (AdminAiReportResult) ]
        │
        ▼
[ Render Frontend: Visual Chart / Data Table + Insight Cards ]
```

### Tahapan Detail Eksekusi:

| No | Tahap | Input | Proses | Output |
|---|---|---|---|---|
| **1** | **Query Request** | Pertanyaan teks bebas dari Admin | Diterima controller via endpoint `/api/admin/report/query`. | Validated input string. |
| **2** | **Text-to-SQL** | Pertanyaan user + Skema database | LLM menerjemahkan intent menjadi SQL `SELECT` agregasi. | Object SQL, referenced tables, chart hint. |
| **3** | **Guardrail & DB** | SQL query string | Filter keamanan regex read-only, jalankan di PostgreSQL. | Raw array of rows (data mentah). |
| **4** | **Data Synthesis** | Raw rows data + Synthesis prompt | LLM menyusun narasi, grafik, tabel, takeaways, dan saran. | JSON `AdminAiReportResult`. |
| **5** | **Frontend UI** | Response JSON | Frontend me-render grafik interaktif & kartu rekomendasi. | Tampilan dasbor analitik visual. |

---

## 3. Detail Pipeline & Komponen

### A. Step 1: Text-to-SQL Extraction
Pada tahap ini, LLM bertindak sebagai *Database Architect* yang memahami struktur skema tabel PostgreSQL GlucoCare:
- `chat_sessions`: Memantau volume chat, status sesi (`ACTIVE`, `COMPLETED`, `ABANDONED`), deteksi darurat (`is_emergency`), triase medis (`sbar_complete`), dan konversi lead (`lead_captured`).
- `chat_leads`: Data calon pasien (nama, WhatsApp, tipe diabetes, obat rutin, keluhan utama, status kualifikasi `ELIGIBLE` / `NEEDS_REVIEW` / `NOT_ELIGIBLE`).
- `chat_messages`: Riwayat interaksi percakapan pasien dan AI.
- `doctors`, `doctor_categories`, & `doctor_category_assignments`: Data dokter spesialis, kategori, dan rujukan.
- `products`: Katalog glukometer, strip tes, obat, dan suplemen diabetes beserta harga dan status aktif.

Prompt instruksi (`src/prompts/admin-report.ts`) memandu LLM untuk menghasilkan query SQL PostgreSQL yang ringkas menggunakan agregasi (`COUNT`, `SUM`, `AVG`, `DATE_TRUNC`, `GROUP BY`) dengan batas limit data.

### B. Step 2: Security Guardrail & Safe Execution
Sebelum query dijalankan ke PostgreSQL, query melewati filter regex `DANGEROUS_SQL_PATTERN`:
```typescript
const DANGEROUS_SQL_PATTERN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|PG_SLEEP)\b/i;
```
Jika terdeteksi kata kunci modifikasi atau bukan diawali klausa `SELECT`, sistem melempar error `400 INVALID_SQL_OPERATION`. Data hasil query kemudian di-serialize agar aman dari masalah `TypeError: Do not know how to serialize a BigInt`.

### C. Step 3: Data Synthesis & Visual Recommendation
LLM menganalisis data mentah dan menentukan tipe visualisasi yang paling efektif:
1. **`bar`**: Untuk perbandingan volume harian atau perbandingan antar kategori diskrit.
2. **`line`**: Untuk kurva tren waktu berkelanjutan (*time-series*).
3. **`doughnut`**: Untuk distribusi proporsi atau persentase komposisi (misal: sebaran tipe diabetes).
4. **`ranking`**: Untuk daftar peringkat popularitas/performa (misal: dokter paling banyak dirujuk).
5. **`table`**: Untuk daftar katalog multi-kolom terperinci (misal: daftar nama produk, kategori, dan harga).

Selain grafik, LLM merumuskan:
- **`takeaways`**: 2–3 temuan penting dengan indikator status (`positive`, `warning`, `neutral`, `danger`).
- **`recommendations`**: 2–3 langkah taktis terukur dengan tingkat urgensi (`Tinggi`, `Sedang`, `Rendah`) dan departemen terkait.
- **Label Metrik**: `dimensionLabel`, `metricLabel`, `secondaryMetricLabel`, dan `unit` untuk keselarasan tabel dan visual grafik di frontend.

---

## 4. Struktur File & Modul Backend

Semua kode diimplementasikan mengikuti struktur modular backend `aisma-be`:

| Modul | Lokasi File | Fungsi |
|---|---|---|
| **Types** | `src/types/admin-report.ts` | Definisi tipe data TypeScript `AdminAiReportResult`, `ChartType`, `TakeawayItem`, dll. |
| **Validators** | `src/validators/admin-report.validator.ts` | Skema validasi Zod untuk request body dan sanitasi output LLM. |
| **Prompts** | `src/prompts/admin-report.ts` | Template prompt Text-to-SQL dan Data Synthesis. |
| **Service** | `src/services/admin-report.service.ts` | Logika 2-step pipeline, guardrail keamanan, query database, dan fallback generator. |
| **Controller** | `src/controllers/admin-report.controller.ts` | Request handler HTTP untuk endpoint `POST /api/admin/report/query`. |
| **Routes** | `src/routes/admin-report.routes.ts` | Router Express dengan proteksi middleware auth admin (`requireAuth`). |
| **App Entry** | `src/app.ts` | Registrasi router pada path `/api/admin/report`. |

---

## 5. Fitur yang Telah Diimplementasikan

- [x] **Natural Language to SQL**: Menerjemahkan pertanyaan bebas dalam Bahasa Indonesia menjadi SQL PostgreSQL yang valid.
- [x] **Eksekusi Data Real-Time**: Data ditarik langsung dari database PostgreSQL aktual.
- [x] **Visualisasi Multi-Tipe**: Mendukung grafik Bar, Line, Doughnut, Ranking, dan Multi-column Data Table.
- [x] **Labeling Dinamis**: Mendukung pelabelan dimensi, metrik utama, metrik sekunder, dan satuan unit.
- [x] **Guardrail Read-Only**: Pencegahan injeksi modifikasi database berbahaya.
- [x] **Fallback Resilient**: Jika LLM rate limit atau timeout, sistem menyediakan sintesis fallback sehingga antarmuka admin tidak pernah macet.
- [x] **Multi-Key Rotation**: Mendukung rotasi API key Groq dan OpenRouter.

---

## 6. Rencana Pengembangan Selanjutnya (Roadmap)

1. **Export PDF / Excel**: Penambahan tombol unduh laporan hasil analisis AI langsung ke format PDF atau spreadsheet Excel untuk keperluan rapat pimpinan.
2. **Scheduled Automated Reports**: Pengiriman ringkasan analitik mingguan secara otomatis via email atau notifikasi WhatsApp ke manajemen klinik.
3. **Penyempurnaan Fine-Grained Filters**: Kemampuan memfilter berdasarkan rentang tanggal kustom (date picker) langsung digabungkan ke query LLM.
4. **Caching Laporan Berkala**: Menyimpan cache query analitik berat dengan Redis agar beban komputasi database tetap optimal.
