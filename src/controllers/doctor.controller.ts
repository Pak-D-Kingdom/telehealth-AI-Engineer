import type { RequestHandler } from "express";
import {
  adminDoctorQuerySchema,
  createDoctorSchema,
  publicDoctorQuerySchema,
  updateDoctorSchema,
} from "../validators/doctor.validator";
import { identifierParamsSchema, uuidParamsSchema } from "../validators/common";
import {
  createDoctor,
  deleteDoctor,
  getPublicDoctor,
  listDoctorCategories,
  listDoctors,
  updateDoctor,
} from "../services/doctor.service";

export const listPublic: RequestHandler = async (req, res) => {
  const query = publicDoctorQuerySchema.parse(req.query);
  const result = await listDoctors(query, true);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const listAdmin: RequestHandler = async (req, res) => {
  const query = adminDoctorQuerySchema.parse(req.query);
  const result = await listDoctors(query, false);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const getPublic: RequestHandler = async (req, res) => {
  const { identifier } = identifierParamsSchema.parse(req.params);
  const doctor = await getPublicDoctor(identifier);
  res.status(200).json({ data: doctor });
};

export const create: RequestHandler = async (req, res) => {
  const input = createDoctorSchema.parse(req.body);
  const doctor = await createDoctor(input);
  res.status(201).json({ data: doctor });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const input = updateDoctorSchema.parse(req.body);
  const doctor = await updateDoctor(id, input);
  res.status(200).json({ data: doctor });
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  await deleteDoctor(id);
  res.status(204).send();
};

export const listCategories: RequestHandler = async (_req, res) => {
  const categories = await listDoctorCategories();
  res.status(200).json({ data: categories });
};
