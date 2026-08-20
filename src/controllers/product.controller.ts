import type { RequestHandler } from "express";
import {
  adminProductQuerySchema,
  createProductSchema,
  publicProductQuerySchema,
  updateProductSchema,
} from "../validators/product.validator";
import { identifierParamsSchema, uuidParamsSchema } from "../validators/common";
import {
  createProduct,
  deleteProduct,
  getPublicProduct,
  listProducts,
  updateProduct,
} from "../services/product.service";

export const listPublic: RequestHandler = async (req, res) => {
  const query = publicProductQuerySchema.parse(req.query);
  const result = await listProducts(query, true);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const listAdmin: RequestHandler = async (req, res) => {
  const query = adminProductQuerySchema.parse(req.query);
  const result = await listProducts(query, false);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const getPublic: RequestHandler = async (req, res) => {
  const { identifier } = identifierParamsSchema.parse(req.params);
  const product = await getPublicProduct(identifier);
  res.status(200).json({ data: product });
};

export const create: RequestHandler = async (req, res) => {
  const input = createProductSchema.parse(req.body);
  const product = await createProduct(input);
  res.status(201).json({ data: product });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const input = updateProductSchema.parse(req.body);
  const product = await updateProduct(id, input);
  res.status(200).json({ data: product });
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  await deleteProduct(id);
  res.status(204).send();
};
