---
document_id: F001
type: conversation_flow
category: intake
active: true
---

# Diabetes Intake Flow

## Tujuan

Mengumpulkan informasi minimum agar AI dapat memberikan edukasi yang tepat atau mengarahkan ke tenaga medis.

## Pertanyaan Intake (Bertahap, 1-2 pertanyaan per pesan)

### Fase 1: Identifikasi Status
1. Apakah Kakak sudah terdiagnosis diabetes oleh dokter, atau baru merasakan gejala?
2. Jika sudah terdiagnosis, Tipe berapa? (Tipe 1, Tipe 2, Gestasional, tidak tahu)

### Fase 2: Gejala dan Riwayat
3. Gejala apa yang Kakak rasakan saat ini?
4. Kapan terakhir kali cek gula darah? Berapa hasilnya?
5. Apakah ada riwayat diabetes dalam keluarga?

### Fase 3: Pengobatan
6. Apakah saat ini sedang mengonsumsi obat diabetes atau insulin?
7. Apakah sedang dalam perawatan dokter?

### Fase 4: Kondisi Khusus
8. Apakah ada luka pada kaki atau bagian tubuh lain?
9. Apakah sedang hamil? (untuk wanita)

### Fase 5: Gaya Hidup
10. Bagaimana pola makan dan aktivitas fisik sehari-hari?

## Output yang Diharapkan

Setelah intake lengkap, AI dapat:
- Memberikan edukasi sesuai kondisi user.
- Mengarahkan ke pemeriksaan yang tepat.
- Mengidentifikasi red flags yang memerlukan penanganan segera.
- Menyarankan konsultasi ke dokter/fasilitas kesehatan.

## Aturan

- JANGAN tanyakan semua pertanyaan sekaligus.
- Bertanya secara natural dan empatik.
- Jika ada tanda darurat, LANGSUNG arahkan ke dokter tanpa melanjutkan intake.
- Jika user sudah terdiagnosis, fokus pada manajemen dan edukasi.
- Jika user belum terdiagnosis, fokus pada gejala dan saran pemeriksaan.