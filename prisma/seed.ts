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
  { id: "diabetes2", name: "Diabetes Tipe 2" },
  { id: "ulkus", name: "Luka Diabetes (Ulkus)" },
  { id: "insulin", name: "Sensitivitas Insulin" },
  { id: "gestational", name: "Diabetes Gestasional" },
];

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
      update: { name: category.name },
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
