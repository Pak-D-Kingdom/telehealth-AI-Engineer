# Knowledge Base - Diabetes Health Assistant

## Struktur Folder

| Folder | Isi |
|--------|-----|
| brand/ | Profil platform dan tone of voice |
| conditions/ | Definisi, klasifikasi, etiologi diabetes |
| symptoms/ | Gejala klinis diabetes |
| complications/ | Komplikasi akut dan kronik |
| management/ | Penatalaksanaan, perawatan kaki, diet, olahraga |
| monitoring/ | Pemeriksaan lab dan jadwal pemantauan |
| conversation_flows/ | Alur percakapan intake |
| safety/ | Red flags dan batasan AI |
| faq/ | Pertanyaan umum dan mitos/fakta |
| policies/ | Privasi dan disclaimer |

## Aturan Penulisan

1. Gunakan Bahasa Indonesia yang mudah dipahami.
2. Sertakan frontmatter YAML di setiap file.
3. Satu topik per file untuk memudahkan retrieval.
4. Gunakan heading dan bullet points untuk struktur.
5. Hindari jargon medis tanpa penjelasan.
6. Selalu cantumkan disclaimer medis.
7. Untuk red flags, gunakan huruf KAPITAL untuk penekanan.

## Catatan

- Konten berdasarkan referensi: Kemenkes RI (2018), PERKENI (2021), WHO (2016), American Diabetes Association.
- Konten akan di-chunk dan di-embed ke FAISS oleh RAG Service.
- Jangan hapus frontmatter YAML.