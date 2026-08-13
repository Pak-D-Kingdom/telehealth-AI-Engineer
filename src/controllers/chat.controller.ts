import type { RequestHandler } from "express";
import {
  abandonChatSession,
  getCurrentChatHistory,
  processChatMessage,
  resolveOrCreateChatSession,
} from "../services/chat.service";
import { chatSessionParamsSchema, sendChatSchema } from "../validators/chat.validator";
import {
  CHAT_SESSION_COOKIE_NAME,
  chatSessionCookieOptions,
  clearChatSessionCookieOptions,
} from "../utils/chat-session";

export const sendMessage: RequestHandler = async (req, res) => {
  const input = sendChatSchema.parse(req.body);
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const session = await resolveOrCreateChatSession(token);

  res.cookie(CHAT_SESSION_COOKIE_NAME, session.token, chatSessionCookieOptions);
  const data = await processChatMessage(session, input.message);
  res.status(200).json({ data });
};

export const currentHistory: RequestHandler = async (req, res) => {
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const data = await getCurrentChatHistory(token);
  res.status(200).json({ data });
};

export const historyBySessionId: RequestHandler = async (req, res) => {
  const { sessionId } = chatSessionParamsSchema.parse(req.params);
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const data = await getCurrentChatHistory(token, sessionId);
  res.status(200).json({ data });
};

export const endSession: RequestHandler = async (req, res) => {
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  await abandonChatSession(token);
  res.clearCookie(CHAT_SESSION_COOKIE_NAME, clearChatSessionCookieOptions);
  res.status(204).send();
};

function readChatToken(value: unknown) {
  return typeof value === "string" && value.length <= 200 ? value : undefined;
}
