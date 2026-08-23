import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/app-error";
import { createSlug } from "../utils/slug";

interface DoctorListQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  active?: boolean;
}

interface DoctorInput {
  slug?: string;
  name: string;
  specialty: string;
  experience: string;
  registrationNumber?: string | null;
  image?: string | null;
  isActive?: boolean;
  categoryIds: string[];
}

interface DoctorUpdate extends Partial<DoctorInput> {}

const doctorInclude = {
  categories: {
    include: { category: true },
  },
} satisfies Prisma.DoctorInclude;

function serializeDoctor<T extends { categories: Array<{ category: unknown }> }>(doctor: T) {
  const { categories, ...data } = doctor;
  return {
    ...data,
    categories: categories.map((item) => item.category),
  };
}

function buildWhere(query: DoctorListQuery, publicOnly: boolean): Prisma.DoctorWhereInput {
  return {
    ...(publicOnly ? { isActive: true } : query.active === undefined ? {} : { isActive: query.active }),
    ...(query.categoryId
      ? { categories: { some: { categoryId: query.categoryId } } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { specialty: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listDoctors(query: DoctorListQuery, publicOnly = true) {
  const where = buildWhere(query, publicOnly);
  const skip = (query.page - 1) * query.limit;
  const [rows, total] = await prisma.$transaction([
    prisma.doctor.findMany({
      where,
      include: doctorInclude,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.doctor.count({ where }),
  ]);

  return {
    items: rows.map(serializeDoctor),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicDoctor(identifier: string) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      isActive: true,
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
    },
    include: doctorInclude,
  });

  if (!doctor) {
    throw new AppError(404, "DOCTOR_NOT_FOUND", "Dokter tidak ditemukan.");
  }

  return serializeDoctor(doctor);
}

export async function createDoctor(input: DoctorInput) {
  await ensureCategoriesExist(input.categoryIds);
  const { categoryIds, ...doctorData } = input;
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const slug = input.slug ?? createSlug(input.name);

  if (!slug) {
    throw new AppError(422, "INVALID_SLUG", "Nama dokter belum dapat digunakan. Coba periksa kembali namanya.");
  }

  const doctor = await prisma.doctor.create({
    data: {
      ...doctorData,
      slug,
      categories: {
        create: uniqueCategoryIds.map((categoryId) => ({
          category: { connect: { id: categoryId } },
        })),
      },
    },
    include: doctorInclude,
  });

  return serializeDoctor(doctor);
}

export async function updateDoctor(id: string, input: DoctorUpdate) {
  const { categoryIds, ...doctorData } = input;
  const uniqueCategoryIds = categoryIds ? [...new Set(categoryIds)] : undefined;

  if (uniqueCategoryIds) {
    await ensureCategoriesExist(uniqueCategoryIds);
  }

  const doctor = await prisma.$transaction(async (transaction) => {
    await transaction.doctor.update({
      where: { id },
      data: doctorData,
    });

    if (uniqueCategoryIds) {
      await transaction.doctorCategoryAssignment.deleteMany({
        where: { doctorId: id },
      });
      await transaction.doctorCategoryAssignment.createMany({
        data: uniqueCategoryIds.map((categoryId) => ({ doctorId: id, categoryId })),
      });
    }

    return transaction.doctor.findUniqueOrThrow({
      where: { id },
      include: doctorInclude,
    });
  });

  return serializeDoctor(doctor);
}

export async function deleteDoctor(id: string) {
  await prisma.doctor.delete({ where: { id } });
}

export function listDoctorCategories() {
  return prisma.doctorCategory.findMany({
    orderBy: { name: "asc" },
  });
}

async function ensureCategoriesExist(categoryIds: string[]) {
  const uniqueIds = [...new Set(categoryIds)];
  const count = await prisma.doctorCategory.count({
    where: { id: { in: uniqueIds } },
  });

  if (count !== uniqueIds.length) {
    throw new AppError(
      422,
      "INVALID_DOCTOR_CATEGORY",
      "Satu atau lebih bidang keahlian yang dipilih tidak tersedia.",
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
