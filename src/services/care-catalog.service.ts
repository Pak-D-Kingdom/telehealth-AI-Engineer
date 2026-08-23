import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { RelatedCareOptions, SuggestedReply } from "../types/chat";

interface CareProfile {
  label: string;
  doctorCategoryIds: string[];
  doctorTerms: string[];
  productTerms: string[];
  medicationTerms: string[];
}

const DOMAIN_PATTERN = /\b(diabet(?:es)?|gula darah|glukosa|hba1c|insulin|metformin|hiperglikemia|hipoglikemia|ulkus|luka diabet|gestasional)\b/i;
const EXPLICIT_CARE_INTENT_PATTERN =
  /\b(rekom(?:endasi(?:kan)?|end)?|recommend(?:ed|ation)?|sarankan|saran|cocok|obat apa|produk apa|dokter|spesialis|konsultasi|rujuk|rujukan)\b/i;
const THERAPY_DECISION_PATTERN =
  /\b(resep|dosis|aman|keamanan|boleh(?:kah)?|beli|berhenti|hentikan|menghentikan|ganti|mengganti)\b/i;
const THERAPY_SUBJECT_PATTERN =
  /\b(obat|metformin|insulin|glp-?1|suplemen|resep|glucometer|strip|alat cek)\b/i;
const MEDICATION_REQUEST_PATTERN =
  /\b(obat|metformin|glimepiride|acarbose|insulin|glp-?1|resep)\b/i;
const DOCTOR_REQUEST_PATTERN = /\b(dokter|spesialis|konsultasi|rujuk|rujukan)\b/i;
const PRODUCT_REQUEST_PATTERN =
  /\b(obat|produk|metformin|glimepiride|acarbose|insulin|suplemen|glucometer|strip|alat cek|beli|resep)\b/i;
const NON_PRESCRIPTION_PATTERN = /\b(tanpa resep|non[- ]?resep|obat bebas|produk pendukung)\b/i;
const DIABETES_TYPE_PATTERN = /\b(tipe|type)\s*(1|2)\b|\b(gestasional|kehamilan)\b/i;
const PRESCRIPTION_PRODUCT_PATTERN =
  /\b(obat keras|obat resep|metformin|glimepiride|acarbose)\b/i;

const PROFILES: Array<{ pattern: RegExp; profile: CareProfile }> = [
  {
    pattern: /\b(ulkus|luka|borok|infeksi kaki)\b/i,
    profile: {
      label: "luka diabetes",
      doctorCategoryIds: ["ulkus", "diabetes2"],
      doctorTerms: ["luka diabetes", "ulkus"],
      productTerms: ["ulkus", "luka", "glucoderm"],
      medicationTerms: [],
    },
  },
  {
    pattern: /\b(gestasional|hamil|kehamilan)\b/i,
    profile: {
      label: "diabetes gestasional",
      doctorCategoryIds: ["gestational"],
      doctorTerms: ["gestasional", "hba1c"],
      productTerms: ["glucometer", "alat cek", "strip"],
      medicationTerms: [],
    },
  },
  {
    pattern: /\b(?:diabetes\s*)?(?:tipe|type)\s*1\b/i,
    profile: {
      label: "diabetes tipe 1",
      doctorCategoryIds: ["insulin"],
      doctorTerms: ["insulin", "endokrinologi", "diabetes tipe 1"],
      productTerms: ["insulin", "glucometer", "alat cek", "strip", "lancet", "keton"],
      medicationTerms: [],
    },
  },
  {
    pattern: /\b(?:diabetes\s*)?(?:tipe|type)\s*2\b/i,
    profile: {
      label: "diabetes tipe 2",
      doctorCategoryIds: ["diabetes2", "insulin"],
      doctorTerms: ["diabetes tipe 2", "kontrol gula darah", "endokrinologi"],
      productTerms: ["metformin", "glucometer", "alat cek"],
      medicationTerms: ["metformin", "glimepiride", "acarbose"],
    },
  },
  {
    pattern: /\b(hba1c|cek gula|monitor|pemantauan|gula darah puasa|gdp|gds)\b/i,
    profile: {
      label: "pemantauan gula darah",
      doctorCategoryIds: ["diabetes2", "insulin"],
      doctorTerms: ["kontrol gula darah", "hba1c", "endokrinologi"],
      productTerms: ["glucometer", "alat cek", "strip"],
      medicationTerms: [],
    },
  },
  {
    pattern: /\b(insulin|sensitivitas|resistensi)\b/i,
    profile: {
      label: "insulin dan kontrol gula darah",
      doctorCategoryIds: ["insulin", "diabetes2"],
      doctorTerms: ["insulin", "endokrinologi", "kontrol gula darah"],
      productTerms: ["glucometer", "alat cek", "metformin"],
      medicationTerms: ["metformin", "glimepiride", "acarbose"],
    },
  },
];

const DEFAULT_DIABETES_PROFILE: CareProfile = {
  label: "diabetes dan kontrol gula darah",
  doctorCategoryIds: ["diabetes2", "insulin"],
  doctorTerms: ["diabetes tipe 2", "kontrol gula darah", "endokrinologi"],
  productTerms: ["metformin", "glucometer", "alat cek"],
  medicationTerms: ["metformin", "glimepiride", "acarbose"],
};

const relatedCareSchema = z.object({
  reason: z.string(),
  disclaimer: z.string(),
  products: z.array(z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    category: z.string(),
    price: z.number().int().nonnegative(),
    image: z.string().nullable(),
    guidance: z.string(),
    requiresPrescription: z.boolean(),
  })),
  doctors: z.array(z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    specialty: z.string(),
    experience: z.string(),
    image: z.string().nullable(),
  })),
  suggestedReplies: z.array(z.object({
    id: z.string(),
    label: z.string(),
    message: z.string(),
  })).max(4).default([]),
});

export function shouldShowRelatedCare(
  message: string,
  conversationContext = message,
) {
  const hasCurrentCareIntent = EXPLICIT_CARE_INTENT_PATTERN.test(message) ||
    (THERAPY_DECISION_PATTERN.test(message) && THERAPY_SUBJECT_PATTERN.test(message));

  return hasCurrentCareIntent && DOMAIN_PATTERN.test(`${conversationContext}\n${message}`);
}

export async function findRelatedCareOptions(
  message: string,
  conversationContext = message,
): Promise<RelatedCareOptions | undefined> {
  if (!shouldShowRelatedCare(message, conversationContext)) return undefined;

  const profileContext = `${conversationContext}\n${message}`;
  const profile = PROFILES.find((item) => item.pattern.test(message))?.profile
    ?? PROFILES.find((item) => item.pattern.test(conversationContext))?.profile
    ?? DEFAULT_DIABETES_PROFILE;
  const wantsMedication = MEDICATION_REQUEST_PATTERN.test(message);
  const wantsDoctorOnly = DOCTOR_REQUEST_PATTERN.test(message) && !PRODUCT_REQUEST_PATTERN.test(message);
  const wantsNonPrescription = NON_PRESCRIPTION_PATTERN.test(message);
  const [products, doctors] = await prisma.$transaction([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        price: true,
        image: true,
        specs: true,
        description: true,
      },
      take: 100,
    }),
    prisma.doctor.findMany({
      where: {
        isActive: true,
        categories: { some: { categoryId: { in: profile.doctorCategoryIds } } },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        specialty: true,
        experience: true,
        image: true,
        categories: { select: { categoryId: true } },
      },
      take: 20,
    }),
  ]);

  const rankedProducts = products
    .map((product) => {
      const searchableText =
        `${product.slug} ${product.name} ${product.category} ${product.specs ?? ""} ${product.description ?? ""}`;
      const requiresPrescription = isPrescriptionProduct(searchableText);
      return {
        product,
        requiresPrescription,
        score: (isCatalogItemMentioned(message, product.name) ? 10 : 0) +
          scoreText(searchableText, profile.productTerms) +
          (wantsMedication ? scoreText(searchableText, profile.medicationTerms) * 3 : 0),
      };
    })
    .filter((item) => !wantsDoctorOnly && item.score > 0)
    .filter((item) => !wantsNonPrescription || !item.requiresPrescription)
    .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name))
    .slice(0, 2)
    .map(({ product, requiresPrescription }) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.image,
        requiresPrescription,
        guidance: requiresPrescription
          ? "Obat ini memerlukan resep dan pemeriksaan dokter."
          : "Tanyakan kepada tenaga medis apakah produk ini sesuai kebutuhan Anda.",
      }));

  const rankedDoctors = doctors
    .map((doctor) => ({
      doctor,
      score: doctor.categories.reduce(
        (total, category) => total + (profile.doctorCategoryIds.includes(category.categoryId) ? 1 : 0),
        isCatalogItemMentioned(message, doctor.name) ? 10 : 0,
      ) + scoreText(`${doctor.name} ${doctor.specialty}`, profile.doctorTerms),
    }))
    .sort((left, right) => right.score - left.score || left.doctor.name.localeCompare(right.doctor.name))
    .slice(0, 2)
    .map(({ doctor }) => ({
      id: doctor.id,
      slug: doctor.slug,
      name: doctor.name,
      specialty: doctor.specialty,
      experience: doctor.experience,
      image: doctor.image,
    }));

  if (rankedProducts.length === 0 && rankedDoctors.length === 0) return undefined;

  return {
    reason: `Produk dan dokter terkait ${profile.label}`,
    disclaimer:
      "Pilihan ini mengikuti topik percakapan, bukan diagnosis atau resep untuk Anda. Dokter perlu memastikan obat yang sesuai, dosis, dan keamanannya.",
    products: rankedProducts,
    doctors: rankedDoctors,
    suggestedReplies: buildCareSuggestions(profileContext, profile.label),
  };
}

export function buildCareSuggestions(
  conversationContext: string,
  profileLabel = DEFAULT_DIABETES_PROFILE.label,
): SuggestedReply[] {
  if (!DIABETES_TYPE_PATTERN.test(conversationContext)) {
    return [
      {
        id: "diabetes-type-2",
        label: "Diabetes tipe 2",
        message: "Saya memiliki diabetes tipe 2 dan ingin melihat rekomendasi produk atau dokter terkait.",
      },
      {
        id: "diabetes-type-1",
        label: "Diabetes tipe 1",
        message: "Saya memiliki diabetes tipe 1 dan ingin melihat rekomendasi produk atau dokter terkait.",
      },
      {
        id: "diabetes-type-unknown",
        label: "Belum tahu tipenya",
        message: "Saya belum tahu tipe diabetes saya dan ingin konsultasi dokter serta melihat produk pemantauan yang terkait.",
      },
    ];
  }

  return [
    {
      id: "supporting-products",
      label: "Produk tanpa resep",
      message: `Saya ingin rekomendasi produk pendukung tanpa resep untuk ${profileLabel}.`,
    },
    {
      id: "doctor-consultation",
      label: "Konsultasi dokter",
      message: `Saya ingin konsultasi dengan dokter terkait ${profileLabel}.`,
    },
    {
      id: "medication-safety",
      label: "Bahas keamanan obat",
      message: `Saya ingin membahas keamanan obat yang sedang digunakan untuk ${profileLabel} dengan dokter.`,
    },
  ];
}

export function parseStoredRelatedCare(value: unknown) {
  const result = relatedCareSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

function scoreText(value: string, terms: string[]) {
  const normalized = value.toLocaleLowerCase("id-ID");
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

function isPrescriptionProduct(value: string) {
  return PRESCRIPTION_PRODUCT_PATTERN.test(value);
}

function isCatalogItemMentioned(message: string, itemName: string) {
  return message.toLocaleLowerCase("id-ID").includes(itemName.toLocaleLowerCase("id-ID"));
}
