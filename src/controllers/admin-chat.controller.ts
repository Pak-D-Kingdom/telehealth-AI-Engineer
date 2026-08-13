import type { RequestHandler } from "express";
import { uuidParamsSchema } from "../validators/common";
import {
  adminChatListQuerySchema,
  updateAdminChatSchema,
} from "../validators/admin-chat.validator";
import {
  getAdminChatSession,
  getAdminChatStats,
  listAdminChatSessions,
  updateAdminChatSession,
} from "../services/admin-chat.service";

export const list: RequestHandler = async (req, res) => {
  const query = adminChatListQuerySchema.parse(req.query);
  const result = await listAdminChatSessions(query);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const stats: RequestHandler = async (_req, res) => {
  const data = await getAdminChatStats();
  res.status(200).json({ data });
};

export const detail: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const data = await getAdminChatSession(id);
  res.status(200).json({ data });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const input = updateAdminChatSchema.parse(req.body);
  const data = await updateAdminChatSession(id, input);
  res.status(200).json({ data });
};
