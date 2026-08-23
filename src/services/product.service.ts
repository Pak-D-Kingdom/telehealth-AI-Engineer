import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/app-error";
import { createSlug } from "../utils/slug";

interface ProductListQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  active?: boolean;
}

interface ProductInput {
  slug?: string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
  specs?: string | null;
  description?: string | null;
  isActive?: boolean;
}

interface ProductUpdate extends Partial<ProductInput> {}

function buildWhere(query: ProductListQuery, publicOnly: boolean): Prisma.ProductWhereInput {
  return {
    ...(publicOnly ? { isActive: true } : query.active === undefined ? {} : { isActive: query.active }),
    ...(query.category
      ? { category: { equals: query.category, mode: "insensitive" } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { category: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listProducts(query: ProductListQuery, publicOnly = true) {
  const where = buildWhere(query, publicOnly);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicProduct(identifier: string) {
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
    },
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan.");
  }

  return product;
}

export async function createProduct(input: ProductInput) {
  const slug = input.slug ?? createSlug(input.name);

  if (!slug) {
    throw new AppError(422, "INVALID_SLUG", "Nama produk belum dapat digunakan. Coba gunakan nama yang lebih jelas.");
  }

  return prisma.product.create({
    data: { ...input, slug },
  });
}

export async function updateProduct(id: string, input: ProductUpdate) {
  return prisma.product.update({
    where: { id },
    data: input,
  });
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
