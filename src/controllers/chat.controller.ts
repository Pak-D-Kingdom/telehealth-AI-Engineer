import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import {
  abandonChatSession,
  finalizeChatResponse,
  getCurrentChatHistory,
  prepareChatMessage,
  prepareChatRetry,
  processChatMessage,
  resolveOrCreateChatSession,
  retryChatMessage,
  type PreparedChatResponse,
} from "../services/chat.service";
import { getAIProviderStatus, streamChatCompletion } from "../services/ai.service";
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

export const sendMessageStream: RequestHandler = async (req, res) => {
  const input = sendChatSchema.parse(req.body);
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const session = await resolveOrCreateChatSession(token);

  res.cookie(CHAT_SESSION_COOKIE_NAME, session.token, chatSessionCookieOptions);
  const prepared = await prepareChatMessage(session, input.message);
  await streamPreparedResponse(res, prepared);
};

export const retryMessage: RequestHandler = async (req, res) => {
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const data = await retryChatMessage(token);
  res.status(200).json({ data });
};

export const retryMessageStream: RequestHandler = async (req, res) => {
  const token = readChatToken(req.cookies?.[CHAT_SESSION_COOKIE_NAME]);
  const prepared = await prepareChatRetry(token);
  await streamPreparedResponse(res, prepared);
};

export const providerStatus: RequestHandler = (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ data: getAIProviderStatus() });
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

async function streamPreparedResponse(
  res: Parameters<RequestHandler>[1],
  prepared: PreparedChatResponse,
) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  writeStreamEvent(res, "meta", {
    sessionId: prepared.sessionId,
    sources: prepared.sources,
    isEmergency: prepared.isEmergency,
  });

  if (prepared.directReply) {
    writeStreamEvent(res, "token", { token: prepared.directReply });
    writeStreamEvent(res, "done", toStreamCompletion({
      sessionId: prepared.sessionId,
      leadComplete: false,
      isEmergency: prepared.isEmergency,
      sources: prepared.sources,
    }));
    res.end();
    return;
  }

  try {
    let reply = "";
    for await (const token of streamChatCompletion(prepared.history, prepared.systemPrompt)) {
      reply += token;
      writeStreamEvent(res, "token", { token });
    }

    if (!reply.trim()) {
      throw new AppError(
        502,
        "INVALID_AI_RESPONSE",
        "Layanan AI tidak mengembalikan jawaban.",
      );
    }

    const completed = await finalizeChatResponse(prepared, reply.trim());
    writeStreamEvent(res, "done", toStreamCompletion(completed));
  } catch (error) {
    writeStreamEvent(res, "error", serializeStreamError(error));
  } finally {
    res.end();
  }
}

function writeStreamEvent(
  res: Parameters<RequestHandler>[1],
  event: string,
  data: unknown,
) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function serializeStreamError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  }

  console.error("Stream chat gagal.", error);
  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Terjadi kesalahan saat menerima jawaban chatbot.",
  };
}

function toStreamCompletion(reply: {
  sessionId: string;
  leadComplete: boolean;
  isEmergency: boolean;
  sources: unknown;
}) {
  return {
    sessionId: reply.sessionId,
    leadComplete: reply.leadComplete,
    isEmergency: reply.isEmergency,
    sources: reply.sources,
  };
}
