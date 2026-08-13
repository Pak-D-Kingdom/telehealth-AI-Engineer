import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";

interface AdminChatListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: "ACTIVE" | "COMPLETED" | "ABANDONED";
  emergency?: boolean;
  leadCaptured?: boolean;
}

interface AdminChatUpdate {
  status?: "ACTIVE" | "COMPLETED" | "ABANDONED";
  qualificationStatus?: "ELIGIBLE" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" | null;
}

export async function listAdminChatSessions(query: AdminChatListQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.chatSession.findMany({
      where,
      select: {
        id: true,
        status: true,
        leadCaptured: true,
        isEmergency: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        lead: true,
        _count: { select: { messages: true } },
      },
      skip,
      take: query.limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.chatSession.count({ where }),
  ]);

  return {
    items: items.map(({ _count, ...session }) => ({
      ...session,
      messageCount: _count.messages,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getAdminChatSession(id: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      leadCaptured: true,
      isEmergency: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      lead: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, role: true, content: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!session) {
    throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Session chat tidak ditemukan.");
  }

  const { _count, ...data } = session;
  return { ...data, messageCount: _count.messages };
}

export async function getAdminChatStats() {
  const [total, active, completed, emergency, captured, needsReview] = await prisma.$transaction([
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { status: "ACTIVE" } }),
    prisma.chatSession.count({ where: { status: "COMPLETED" } }),
    prisma.chatSession.count({ where: { isEmergency: true } }),
    prisma.chatSession.count({ where: { leadCaptured: true } }),
    prisma.chatLead.count({ where: { qualificationStatus: "NEEDS_REVIEW" } }),
  ]);

  return { total, active, completed, emergency, captured, needsReview };
}

export async function updateAdminChatSession(id: string, input: AdminChatUpdate) {
  const exists = await prisma.chatSession.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Session chat tidak ditemukan.");
  }

  await prisma.$transaction(async (transaction) => {
    if (input.status) {
      await transaction.chatSession.update({
        where: { id },
        data: { status: input.status },
      });
    }

    if (input.qualificationStatus !== undefined) {
      await transaction.chatLead.upsert({
        where: { sessionId: id },
        update: { qualificationStatus: input.qualificationStatus },
        create: { sessionId: id, qualificationStatus: input.qualificationStatus },
      });
    }
  });

  return getAdminChatSession(id);
}

function buildWhere(query: AdminChatListQuery): Prisma.ChatSessionWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.emergency === undefined ? {} : { isEmergency: query.emergency }),
    ...(query.leadCaptured === undefined ? {} : { leadCaptured: query.leadCaptured }),
    ...(query.search
      ? {
          OR: [
            { lead: { is: { name: { contains: query.search, mode: "insensitive" } } } },
            { lead: { is: { whatsapp: { contains: query.search, mode: "insensitive" } } } },
            { lead: { is: { diabetesType: { contains: query.search, mode: "insensitive" } } } },
            { messages: { some: { content: { contains: query.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}
