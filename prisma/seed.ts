import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categories = [
  {
    id: "diabetes2",
    name: "Diabetes Tipe 2",
    description: "Dokter untuk edukasi, evaluasi, dan tindak lanjut diabetes tipe 2.",
  },
  {
    id: "ulkus",
    name: "Luka Diabetes (Ulkus)",
    description: "Dokter untuk penilaian luka kaki diabetes dan risiko komplikasi vaskular.",
  },
  {
    id: "insulin",
    name: "Terapi Insulin & Metabolik",
    description: "Dokter untuk evaluasi terapi insulin dan gangguan endokrin-metabolik.",
  },
  {
    id: "gestational",
    name: "Diabetes Gestasional",
    description: "Dokter untuk pemantauan diabetes dalam kehamilan dan kesehatan ibu-janin.",
  },
];

// Seluruh produk dan profil dokter di bawah adalah data demonstrasi. Nama, harga,
// nomor registrasi, dan detail layanan tidak mewakili katalog atau tenaga medis nyata.
const products = [
  {
    slug: "glucometer-pro-digital-kit",
    name: "GlucoMeter Pro Digital Kit",
    category: "Alat Cek Gula Darah Digital",
    price: 189000,
    image: "/images/glucometer.png",
    specs: "Kit Digital • 50 Strip Cek • 50 Jarum Lancet • Garansi 1 Tahun",
    description:
      "Kit lengkap cek kadar gula darah puasa dan sewaktu dengan hasil dalam 5 detik serta memori histori tes.",
  },
  {
    slug: "metformin-500mg-release-control",
    name: "Metformin 500mg Release Control",
    category: "Obat Regulasional Gula Darah",
    price: 45000,
    image: "/images/metformin.png",
    specs: "Metformin HCL 500mg • Controlled Release Tablet",
    description:
      "Obat pengontrol kadar gula darah yang hanya digunakan berdasarkan resep dan pengawasan tenaga medis.",
  },
  {
    slug: "glucoshield-cinnamon-chromium-complex",
    name: "GlucoShield Cinnamon & Chromium Complex",
    category: "Suplemen Sensitivitas Insulin",
    price: 119000,
    image: "/images/cinnamon_herbal.png",
    specs: "Ekstrak Kayu Manis • Chromium Picolinate • Alpha Lipoic Acid",
    description:
      "Suplemen pendamping yang penggunaannya perlu dikonsultasikan dengan tenaga medis.",
  },
  {
    slug: "glucoderm-diabetic-ulcer-care-gel",
    name: "GlucoDerm Diabetic Ulcer Care Gel",
    category: "Gel Perawatan Luka Diabetes",
    price: 139000,
    image: "/images/ulcer_gel.png",
    specs: "Hydrogel Medis • Centella Extract • Zinc Oxide",
    description:
      "Gel perawatan luka diabetes yang digunakan sesuai petunjuk tenaga medis.",
  },
  {
    slug: "glucocare-smartcheck-strip-50",
    name: "GlucoCare SmartCheck Strip 50",
    category: "Strip Tes Gula Darah",
    price: 132000,
    image: "/images/glucometer.png",
    specs: "Isi 50 Strip • Sampel 0,6 µL • Kemasan Individual • Produk Demo",
    description:
      "Strip tes simulasi untuk alat cek gula darah yang kompatibel. Harga dan kompatibilitas wajib dikonfirmasi sebelum penggunaan.",
  },
  {
    slug: "glucocare-softtouch-lancet-100",
    name: "GlucoCare SoftTouch Lancet 100",
    category: "Lancet Steril Sekali Pakai",
    price: 49500,
    image: "/images/glucometer.png",
    specs: "Isi 100 • 30G • Steril • Sekali Pakai • Produk Demo",
    description:
      "Lancet simulasi untuk pengambilan sampel darah kapiler. Jangan menggunakan ulang lancet yang telah dipakai.",
  },
  {
    slug: "insufine-pen-needle-4mm-100",
    name: "InsuFine Pen Needle 4 mm 100",
    category: "Jarum Pena Insulin",
    price: 169000,
    image: "/images/metformin.png",
    specs: "4 mm • 32G • Isi 100 • Steril • Produk Demo",
    description:
      "Jarum pena insulin simulasi. Ukuran dan teknik penyuntikan harus disesuaikan berdasarkan edukasi tenaga medis.",
  },
  {
    slug: "ketocheck-blood-ketone-strip-10",
    name: "KetoCheck Blood Ketone Strip 10",
    category: "Strip Tes Keton Darah",
    price: 185000,
    image: "/images/glucometer.png",
    specs: "Isi 10 Strip • Kemasan Individual • Produk Demo",
    description:
      "Strip keton darah simulasi untuk perangkat yang kompatibel. Hasil tinggi atau gejala berat memerlukan penilaian medis segera.",
  },
  {
    slug: "glucoderm-hydrocolloid-dressing-10x10",
    name: "GlucoDerm Hydrocolloid Dressing 10x10 cm",
    category: "Balutan Luka Diabetes",
    price: 148000,
    image: "/images/ulcer_gel.png",
    specs: "10x10 cm • Isi 5 • Steril • Produk Demo",
    description:
      "Balutan hidrokoloid simulasi untuk perawatan luka. Luka diabetes harus dinilai tenaga medis sebelum memilih jenis balutan.",
  },
  {
    slug: "glucofoot-urea-10-cream",
    name: "GlucoFoot Urea 10% Moisturizing Cream",
    category: "Perawatan Kulit Kaki Diabetes",
    price: 96000,
    image: "/images/ulcer_gel.png",
    specs: "Urea 10% • 100 g • Tanpa Pewangi • Produk Demo",
    description:
      "Krim pelembap simulasi untuk kulit kaki kering. Tidak digunakan pada luka terbuka atau jaringan yang terinfeksi.",
  },
  {
    slug: "glucobalance-low-gi-vanilla-400g",
    name: "GlucoBalance Low GI Vanilla 400 g",
    category: "Nutrisi Rendah Indeks Glikemik",
    price: 178000,
    image: "/images/cinnamon_herbal.png",
    specs: "400 g • Rasa Vanila • Serat Pangan • Produk Demo",
    description:
      "Produk nutrisi simulasi, bukan pengganti pola makan seimbang atau terapi. Kebutuhan nutrisi perlu disesuaikan secara individual.",
  },
  {
    slug: "glimepiride-2mg-glycemic-control-demo",
    name: "Glimepiride 2 mg Glycemic Control (Demo)",
    category: "Obat Resep Antidiabetes",
    price: 72000,
    image: "/images/metformin.png",
    specs: "Glimepiride 2 mg • Tablet • Obat Keras • Produk Demo",
    description:
      "Data produk simulasi. Penggunaan hanya berdasarkan resep, evaluasi risiko hipoglikemia, dan pengawasan dokter.",
  },
  {
    slug: "acarbose-50mg-post-meal-control-demo",
    name: "Acarbose 50 mg Post Meal Control (Demo)",
    category: "Obat Resep Antidiabetes",
    price: 86000,
    image: "/images/metformin.png",
    specs: "Acarbose 50 mg • Tablet • Obat Keras • Produk Demo",
    description:
      "Data produk simulasi. Kecocokan, dosis, kontraindikasi, dan waktu penggunaan harus ditentukan dokter.",
  },
  {
    slug: "glucocare-alcohol-swab-100",
    name: "GlucoCare Alcohol Swab 100",
    category: "Perlengkapan Cek Gula Darah",
    price: 39000,
    image: "/images/glucometer.png",
    specs: "Isopropyl Alcohol 70% • Isi 100 • Sekali Pakai • Produk Demo",
    description:
      "Kapas alkohol simulasi untuk kebersihan kulit sebelum tindakan sesuai petunjuk tenaga kesehatan.",
  },
];

const doctors = [
  {
    slug: "dr-hendra-wijaya",
    name: "dr. Hendra Wijaya, Sp.PD-KEMD",
    specialty: "Spesialis Endokrinologi & Diabetes Tipe 2",
    experience: "12+ Tahun Pengalaman",
    registrationNumber: "DEMO-STR-001",
    image: "/images/doctor_1.png",
    categoryIds: ["diabetes2", "insulin"],
  },
  {
    slug: "dr-siti-rahma",
    name: "dr. Siti Rahma, Sp.PD",
    specialty: "Spesialis Kontrol Gula Darah & Nutrisi",
    experience: "10+ Tahun Pengalaman",
    registrationNumber: "DEMO-STR-002",
    image: "/images/doctor_2.png",
    categoryIds: ["diabetes2", "gestational"],
  },
  {
    slug: "dr-andreas-pratama",
    name: "dr. Andreas Pratama, Sp.PD-KEMD",
    specialty: "Spesialis Luka Diabetes (Ulkus)",
    experience: "14+ Tahun Pengalaman",
    registrationNumber: "DEMO-STR-003",
    image: "/images/doctor_3.png",
    categoryIds: ["ulkus", "diabetes2"],
  },
  {
    slug: "dr-maya-indriani",
    name: "dr. Maya Indriani, Sp.PD",
    specialty: "Spesialis Diabetes Gestasional & HbA1c",
    experience: "9+ Tahun Pengalaman",
    registrationNumber: "DEMO-STR-004",
    image: "/images/doctor_4.png",
    categoryIds: ["gestational", "insulin"],
  },
  {
    slug: "dr-nadia-putri-demo",
    name: "dr. Nadia Putri, Sp.PD-KEMD",
    specialty: "Konsultan Endokrin, Metabolik & Diabetes • Profil Demo",
    experience: "11 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-005",
    image: "/images/doctor_1.png",
    categoryIds: ["diabetes2", "insulin"],
  },
  {
    slug: "dr-rizky-mahendra-demo",
    name: "dr. Rizky Mahendra, Sp.PD-KEMD",
    specialty: "Diabetes Tipe 2 Kompleks & Terapi Insulin • Profil Demo",
    experience: "13 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-006",
    image: "/images/doctor_2.png",
    categoryIds: ["diabetes2", "insulin"],
  },
  {
    slug: "dr-citra-lestari-demo",
    name: "dr. Citra Lestari, Sp.OG, Subsp.KFm",
    specialty: "Obstetri Fetomaternal & Diabetes Gestasional • Profil Demo",
    experience: "12 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-007",
    image: "/images/doctor_4.png",
    categoryIds: ["gestational"],
  },
  {
    slug: "dr-bagas-arya-demo",
    name: "dr. Bagas Arya, Sp.B, Subsp.BVE(K)",
    specialty: "Bedah Vaskular & Luka Kaki Diabetes • Profil Demo",
    experience: "15 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-008",
    image: "/images/doctor_3.png",
    categoryIds: ["ulkus"],
  },
  {
    slug: "dr-laila-nuraini-demo",
    name: "dr. Laila Nuraini, Sp.GK",
    specialty: "Gizi Klinik untuk Diabetes & Kehamilan • Profil Demo",
    experience: "9 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-009",
    image: "/images/doctor_2.png",
    categoryIds: ["diabetes2", "gestational"],
  },
  {
    slug: "dr-fajar-nugroho-demo",
    name: "dr. Fajar Nugroho, Sp.PD",
    specialty: "Penyakit Dalam & Kontrol Diabetes Tipe 2 • Profil Demo",
    experience: "8 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-010",
    image: "/images/doctor_1.png",
    categoryIds: ["diabetes2"],
  },
  {
    slug: "dr-intan-maharani-demo",
    name: "dr. Intan Maharani, Sp.PD-KEMD",
    specialty: "Endokrin-Metabolik & Edukasi Insulin • Profil Demo",
    experience: "10 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-011",
    image: "/images/doctor_4.png",
    categoryIds: ["insulin", "diabetes2"],
  },
  {
    slug: "dr-dimas-prakoso-demo",
    name: "dr. Dimas Prakoso, Sp.PD",
    specialty: "Penyakit Dalam & Pemantauan HbA1c • Profil Demo",
    experience: "7 Tahun Pengalaman",
    registrationNumber: "DEMO-STR-ID-012",
    image: "/images/doctor_3.png",
    categoryIds: ["diabetes2", "insulin"],
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "Telehealth Admin";

  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error(
      "ADMIN_EMAIL dan ADMIN_PASSWORD minimal 12 karakter wajib dikonfigurasi sebelum menjalankan seed.",
    );
  }

  const passwordHash = await Bun.password.hash(adminPassword, "argon2id");

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, isActive: true },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const category of categories) {
    await prisma.doctorCategory.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }

  for (const { categoryIds, ...doctorData } of doctors) {
    const doctor = await prisma.doctor.upsert({
      where: { slug: doctorData.slug },
      update: doctorData,
      create: doctorData,
    });

    await prisma.doctorCategoryAssignment.deleteMany({
      where: { doctorId: doctor.id },
    });

    await prisma.doctorCategoryAssignment.createMany({
      data: categoryIds.map((categoryId) => ({
        doctorId: doctor.id,
        categoryId,
      })),
    });
  }

  console.log("Seed admin, produk, dokter, dan kategori berhasil.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
