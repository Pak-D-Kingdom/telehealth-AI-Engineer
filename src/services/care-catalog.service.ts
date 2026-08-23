import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { RelatedCareOptions } from "../types/chat";

interface CareProfile {
  label: string;
  doctorCategoryIds: string[];
  doctorTerms: string[];
  productTerms: string[];
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
const MEDICATION_PRODUCT_PATTERN =
  /\b(obat|obat keras|antidiabetes|metformin|glimepiride|acarbose|insulin|resep)\b/i;

const PROFILES: Array<{ pattern: RegExp; profile: CareProfile }> = [
  {
    pattern: /\b(ulkus|luka|borok|infeksi kaki)\b/i,
    profile: {
      label: "luka diabetes",
      doctorCategoryIds: ["ulkus", "diabetes2"],
      doctorTerms: ["luka diabetes", "ulkus"],
      productTerms: ["ulkus", "luka", "glucoderm"],
    },
  },
  {
    pattern: /\b(gestasional|hamil|kehamilan)\b/i,
    profile: {
      label: "diabetes gestasional",
      doctorCategoryIds: ["gestational"],
      doctorTerms: ["gestasional", "hba1c"],
      productTerms: ["glucometer", "alat cek", "strip"],
    },
  },
  {
    pattern: /\b(hba1c|cek gula|monitor|pemantauan|gula darah puasa|gdp|gds)\b/i,
    profile: {
      label: "pemantauan gula darah",
      doctorCategoryIds: ["diabetes2", "insulin"],
      doctorTerms: ["kontrol gula darah", "hba1c", "endokrinologi"],
      productTerms: ["glucometer", "alat cek", "strip"],
    },
  },
  {
    pattern: /\b(insulin|sensitivitas|resistensi)\b/i,
    profile: {
      label: "insulin dan kontrol gula darah",
      doctorCategoryIds: ["insulin", "diabetes2"],
      doctorTerms: ["insulin", "endokrinologi", "kontrol gula darah"],
      productTerms: ["glucometer", "alat cek", "metformin"],
    },
  },
];

const DEFAULT_DIABETES_PROFILE: CareProfile = {
  label: "diabetes dan kontrol gula darah",
  doctorCategoryIds: ["diabetes2", "insulin"],
  doctorTerms: ["diabetes tipe 2", "kontrol gula darah", "endokrinologi"],
  productTerms: ["metformin", "glucometer", "alat cek"],
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
  const profile = PROFILES.find((item) => item.pattern.test(profileContext))?.profile
    ?? DEFAULT_DIABETES_PROFILE;
  const wantsMedication = MEDICATION_REQUEST_PATTERN.test(message);
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
      return {
        product,
        score: scoreText(searchableText, profile.productTerms) +
          (wantsMedication && MEDICATION_PRODUCT_PATTERN.test(searchableText) ? 3 : 0),
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name))
    .slice(0, 2)
    .map(({ product }) => {
      const requiresPrescription = /\b(obat|metformin|insulin|resep)\b/i.test(
        `${product.name} ${product.category} ${product.specs ?? ""}`,
      );
      return {
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
      };
    });

  const rankedDoctors = doctors
    .map((doctor) => ({
      doctor,
      score: doctor.categories.reduce(
        (total, category) => total + (profile.doctorCategoryIds.includes(category.categoryId) ? 1 : 0),
        0,
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
  };
}

export function parseStoredRelatedCare(value: unknown) {
  const result = relatedCareSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

function scoreText(value: string, terms: string[]) {
  const normalized = value.toLocaleLowerCase("id-ID");
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}
