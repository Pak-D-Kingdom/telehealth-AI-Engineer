import { randomBytes } from "node:crypto";
import type {
  BookingActorType,
  BookingStatus,
  ConsultationMode,
  Prisma,
  ScheduleSlotStatus,
} from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { normalizeWhatsappNumber } from "./conversation-state.service";
import { hashChatSessionToken } from "../utils/chat-session";

interface PaginationQuery {
  page: number;
  limit: number;
  search?: string;
}

interface AdminBookingQuery extends PaginationQuery {
  status?: BookingStatus;
  doctorId?: string;
  mode?: ConsultationMode;
}

interface AdminScheduleQuery extends PaginationQuery {
  doctorId?: string;
  status?: ScheduleSlotStatus;
  mode?: ConsultationMode;
}

interface CreateScheduleInput {
  doctorId: string;
  clinicId?: string | null;
  mode: ConsultationMode;
  startsAt: Date;
  endsAt: Date;
  price: number;
  notes?: string;
}

interface BookingAccessInput {
  bookingCode: string;
  whatsapp: string;
}

const slotInclude = {
  doctor: {
    select: { id: true, slug: true, name: true, specialty: true, image: true },
  },
  clinic: {
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      address: true,
      whatsapp: true,
    },
  },
} satisfies Prisma.DoctorScheduleSlotInclude;

const bookingInclude = {
  doctor: {
    select: { id: true, slug: true, name: true, specialty: true, image: true },
  },
  slot: { include: { clinic: true } },
  events: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ConsultationBookingInclude;

export async function listPublicDoctorSchedule(
  identifier: string,
  input: { limit: number; mode?: ConsultationMode },
) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      isActive: true,
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
    },
    select: { id: true, slug: true, name: true, specialty: true, image: true },
  });
  if (!doctor)
    throw new AppError(404, "DOCTOR_NOT_FOUND", "Dokter tidak ditemukan.");

  const slots = await prisma.doctorScheduleSlot.findMany({
    where: {
      doctorId: doctor.id,
      status: "AVAILABLE",
      startsAt: { gt: new Date() },
      ...(input.mode ? { mode: input.mode } : {}),
      OR: [{ mode: "ONLINE" }, { mode: "OFFLINE", clinic: { isActive: true } }],
    },
    include: { clinic: true },
    orderBy: { startsAt: "asc" },
    take: input.limit,
  });

  return { doctor, slots };
}

export async function createConsultationBooking(
  input: {
    slotId: string;
    patientName: string;
    whatsapp: string;
    complaint?: string;
  },
  chatToken?: string,
) {
  const whatsapp = normalizeWhatsappNumber(input.whatsapp);
  if (!whatsapp) {
    throw new AppError(
      422,
      "INVALID_WHATSAPP",
      "Masukkan nomor WhatsApp Indonesia yang aktif.",
    );
  }

  const session = chatToken
    ? await prisma.chatSession.findFirst({
        where: {
          tokenHash: hashChatSessionToken(chatToken),
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          isEmergency: true,
          lead: {
            select: {
              diabetesType: true,
              currentMedication: true,
              primaryComplaint: true,
              qualificationStatus: true,
            },
          },
          messages: {
            where: { role: "USER" },
            orderBy: { createdAt: "desc" },
            take: 4,
            select: { content: true },
          },
        },
      })
    : null;

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const slot = await transaction.doctorScheduleSlot.findFirst({
          where: {
            id: input.slotId,
            status: "AVAILABLE",
            startsAt: { gt: new Date() },
            doctor: { isActive: true },
            OR: [
              { mode: "ONLINE" },
              { mode: "OFFLINE", clinic: { isActive: true } },
            ],
          },
          include: slotInclude,
        });
        if (!slot) {
          throw new AppError(
            409,
            "SCHEDULE_SLOT_UNAVAILABLE",
            "Jadwal ini baru saja terisi atau sudah tidak tersedia. Pilih jadwal lain.",
          );
        }

        const claimed = await transaction.doctorScheduleSlot.updateMany({
          where: {
            id: slot.id,
            status: "AVAILABLE",
            startsAt: { gt: new Date() },
          },
          data: { status: "BOOKED" },
        });
        if (claimed.count !== 1) {
          throw new AppError(
            409,
            "SCHEDULE_SLOT_UNAVAILABLE",
            "Jadwal ini baru saja terisi. Pilih jadwal lain.",
          );
        }

        const booking = await transaction.consultationBooking.create({
          data: {
            bookingCode: createBookingCode(),
            sessionId: session?.id,
            doctorId: slot.doctorId,
            slotId: slot.id,
            patientName: input.patientName,
            whatsapp,
            complaint: input.complaint || null,
            preConsultationSummary: buildPreConsultationSummary(
              session,
              input.complaint,
            ),
            consentAt: new Date(),
            events: {
              create: {
                actorType: "PATIENT",
                actorLabel: "Pasien",
                action: "BOOKING_CREATED",
                newStatus: "PENDING",
                details: {
                  mode: slot.mode,
                  startsAt: slot.startsAt.toISOString(),
                },
              },
            },
          },
          include: bookingInclude,
        });

        return booking;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (hasErrorCode(error, "P2034")) {
      throw new AppError(
        409,
        "SCHEDULE_SLOT_UNAVAILABLE",
        "Jadwal ini baru saja terisi. Pilih jadwal lain.",
      );
    }
    throw error;
  }
}

export async function lookupConsultationBooking(input: BookingAccessInput) {
  const access = normalizeBookingAccess(input);
  const booking = await prisma.consultationBooking.findFirst({
    where: {
      bookingCode: access.bookingCode,
      whatsapp: access.whatsapp,
      anonymizedAt: null,
    },
    include: bookingInclude,
  });
  if (!booking) throw bookingAccessError();
  return booking;
}

export async function cancelConsultationBooking(input: BookingAccessInput) {
  const access = normalizeBookingAccess(input);
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.consultationBooking.findFirst({
      where: {
        bookingCode: access.bookingCode,
        whatsapp: access.whatsapp,
        anonymizedAt: null,
      },
      include: bookingInclude,
    });
    if (!booking) throw bookingAccessError();
    if (booking.status === "CANCELLED") return booking;
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      throw new AppError(
        409,
        "BOOKING_CANNOT_BE_CANCELLED",
        "Booking yang sudah selesai tidak dapat dibatalkan.",
      );
    }

    await transaction.doctorScheduleSlot.updateMany({
      where: {
        id: booking.slotId,
        status: "BOOKED",
        startsAt: { gt: new Date() },
      },
      data: { status: "AVAILABLE" },
    });
    await createBookingEvent(transaction, {
      bookingId: booking.id,
      actorType: "PATIENT",
      actorLabel: "Pasien",
      action: "BOOKING_CANCELLED",
      previousStatus: booking.status,
      newStatus: "CANCELLED",
    });

    return transaction.consultationBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
      include: bookingInclude,
    });
  });
}

export async function rescheduleConsultationBooking(
  input: BookingAccessInput & { slotId: string },
) {
  const access = normalizeBookingAccess(input);
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const booking = await transaction.consultationBooking.findFirst({
          where: {
            bookingCode: access.bookingCode,
            whatsapp: access.whatsapp,
            anonymizedAt: null,
          },
          include: bookingInclude,
        });
        if (!booking) throw bookingAccessError();
        if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
          throw new AppError(
            409,
            "BOOKING_CANNOT_BE_RESCHEDULED",
            "Booking yang sudah selesai atau dibatalkan tidak dapat diubah jadwalnya.",
          );
        }
        if (booking.slotId === input.slotId) {
          throw new AppError(
            422,
            "SAME_SCHEDULE",
            "Pilih jadwal baru yang berbeda.",
          );
        }

        const nextSlot = await transaction.doctorScheduleSlot.findFirst({
          where: {
            id: input.slotId,
            doctorId: booking.doctorId,
            status: "AVAILABLE",
            startsAt: { gt: new Date() },
            doctor: { isActive: true },
            OR: [
              { mode: "ONLINE" },
              { mode: "OFFLINE", clinic: { isActive: true } },
            ],
          },
          include: slotInclude,
        });
        if (!nextSlot) {
          throw new AppError(
            409,
            "SCHEDULE_SLOT_UNAVAILABLE",
            "Jadwal pengganti sudah tidak tersedia. Pilih jadwal lain.",
          );
        }

        const claimed = await transaction.doctorScheduleSlot.updateMany({
          where: {
            id: nextSlot.id,
            status: "AVAILABLE",
            startsAt: { gt: new Date() },
          },
          data: { status: "BOOKED" },
        });
        if (claimed.count !== 1) {
          throw new AppError(
            409,
            "SCHEDULE_SLOT_UNAVAILABLE",
            "Jadwal pengganti baru saja terisi. Pilih jadwal lain.",
          );
        }

        await transaction.doctorScheduleSlot.updateMany({
          where: {
            id: booking.slotId,
            status: "BOOKED",
            startsAt: { gt: new Date() },
          },
          data: { status: "AVAILABLE" },
        });
        await createBookingEvent(transaction, {
          bookingId: booking.id,
          actorType: "PATIENT",
          actorLabel: "Pasien",
          action: "BOOKING_RESCHEDULED",
          previousStatus: booking.status,
          newStatus: "PENDING",
          details: {
            previousStartsAt: booking.slot.startsAt.toISOString(),
            nextStartsAt: nextSlot.startsAt.toISOString(),
          },
        });

        return transaction.consultationBooking.update({
          where: { id: booking.id },
          data: { slotId: nextSlot.id, status: "PENDING" },
          include: bookingInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (hasErrorCode(error, "P2034")) {
      throw new AppError(
        409,
        "SCHEDULE_SLOT_UNAVAILABLE",
        "Jadwal pengganti baru saja terisi. Pilih jadwal lain.",
      );
    }
    throw error;
  }
}

export async function requestBookingDataDeletion(input: BookingAccessInput) {
  const access = normalizeBookingAccess(input);
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.consultationBooking.findFirst({
      where: {
        bookingCode: access.bookingCode,
        whatsapp: access.whatsapp,
        anonymizedAt: null,
      },
      include: bookingInclude,
    });
    if (!booking) throw bookingAccessError();
    if (booking.deletionRequestedAt) return booking;

    await createBookingEvent(transaction, {
      bookingId: booking.id,
      actorType: "PATIENT",
      actorLabel: "Pasien",
      action: "DATA_DELETION_REQUESTED",
      previousStatus: booking.status,
      newStatus: booking.status,
    });
    return transaction.consultationBooking.update({
      where: { id: booking.id },
      data: { deletionRequestedAt: new Date() },
      include: bookingInclude,
    });
  });
}

export async function listAdminBookings(query: AdminBookingQuery) {
  const where: Prisma.ConsultationBookingWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.doctorId ? { doctorId: query.doctorId } : {}),
    ...(query.mode ? { slot: { mode: query.mode } } : {}),
    ...(query.search
      ? {
          OR: [
            { bookingCode: { contains: query.search, mode: "insensitive" } },
            { patientName: { contains: query.search, mode: "insensitive" } },
            { whatsapp: { contains: query.search } },
            {
              doctor: { name: { contains: query.search, mode: "insensitive" } },
            },
          ],
        }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.consultationBooking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.consultationBooking.count({ where }),
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

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actorLabel = "Admin GlucoCare",
) {
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.consultationBooking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking)
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan.");
    if (!isBookingTransitionAllowed(booking.status, status)) {
      throw new AppError(
        409,
        "INVALID_BOOKING_STATUS",
        "Status booking tidak dapat diubah ke pilihan tersebut.",
      );
    }
    if (booking.status === status) return booking;

    if (status === "CANCELLED" && booking.status !== "CANCELLED") {
      await transaction.doctorScheduleSlot.updateMany({
        where: {
          id: booking.slotId,
          status: "BOOKED",
          startsAt: { gt: new Date() },
        },
        data: { status: "AVAILABLE" },
      });
    }

    await createBookingEvent(transaction, {
      bookingId: booking.id,
      actorType: "ADMIN",
      actorLabel,
      action: "STATUS_UPDATED",
      previousStatus: booking.status,
      newStatus: status,
    });

    return transaction.consultationBooking.update({
      where: { id },
      data: { status },
      include: bookingInclude,
    });
  });
}

export async function getConsultationStats() {
  const [bookingGroups, slotGroups, deletionRequests, doctorGroups] =
    await Promise.all([
      prisma.consultationBooking.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.doctorScheduleSlot.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.consultationBooking.count({
        where: { deletionRequestedAt: { not: null }, anonymizedAt: null },
      }),
      prisma.consultationBooking.groupBy({
        by: ["doctorId"],
        _count: { _all: true },
        orderBy: { _count: { doctorId: "desc" } },
        take: 5,
      }),
    ]);
  const doctorIds = doctorGroups.map((group) => group.doctorId);
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    select: { id: true, name: true },
  });
  const doctorNames = new Map(
    doctors.map((doctor) => [doctor.id, doctor.name]),
  );
  const bookingCount = Object.fromEntries(
    bookingGroups.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<BookingStatus, number>>;
  const slotCount = Object.fromEntries(
    slotGroups.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<ScheduleSlotStatus, number>>;
  const totalBookings = bookingGroups.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const availableSlots = slotCount.AVAILABLE ?? 0;
  const bookedSlots = slotCount.BOOKED ?? 0;

  return {
    totalBookings,
    pending: bookingCount.PENDING ?? 0,
    confirmed: bookingCount.CONFIRMED ?? 0,
    completed: bookingCount.COMPLETED ?? 0,
    cancelled: bookingCount.CANCELLED ?? 0,
    cancellationRate:
      totalBookings > 0
        ? Math.round(((bookingCount.CANCELLED ?? 0) / totalBookings) * 1_000) /
          10
        : 0,
    availableSlots,
    bookedSlots,
    slotFillRate:
      availableSlots + bookedSlots > 0
        ? Math.round((bookedSlots / (availableSlots + bookedSlots)) * 1_000) /
          10
        : 0,
    deletionRequests,
    topDoctors: doctorGroups.map((group) => ({
      doctorId: group.doctorId,
      name: doctorNames.get(group.doctorId) ?? "Dokter",
      bookingCount: group._count._all,
    })),
  };
}

export async function listAdminSchedules(query: AdminScheduleQuery) {
  const where: Prisma.DoctorScheduleSlotWhereInput = {
    startsAt: { gt: new Date() },
    ...(query.doctorId ? { doctorId: query.doctorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.mode ? { mode: query.mode } : {}),
    ...(query.search
      ? {
          OR: [
            {
              doctor: { name: { contains: query.search, mode: "insensitive" } },
            },
            {
              clinic: { name: { contains: query.search, mode: "insensitive" } },
            },
          ],
        }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.doctorScheduleSlot.findMany({
      where,
      include: slotInclude,
      orderBy: { startsAt: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.doctorScheduleSlot.count({ where }),
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

export async function createDoctorSchedule(input: CreateScheduleInput) {
  if (input.startsAt <= new Date()) {
    throw new AppError(
      422,
      "INVALID_SCHEDULE_TIME",
      "Pilih waktu konsultasi yang belum berlalu.",
    );
  }

  const [doctor, clinic] = await Promise.all([
    prisma.doctor.findFirst({
      where: { id: input.doctorId, isActive: true },
      select: { id: true },
    }),
    input.clinicId
      ? prisma.clinic.findFirst({
          where: { id: input.clinicId, isActive: true },
          select: { id: true },
        })
      : null,
  ]);
  if (!doctor)
    throw new AppError(
      422,
      "INVALID_DOCTOR",
      "Dokter yang dipilih tidak tersedia.",
    );
  if (input.mode === "OFFLINE" && !clinic) {
    throw new AppError(
      422,
      "INVALID_CLINIC",
      "Lokasi praktik yang dipilih tidak tersedia.",
    );
  }

  try {
    return await prisma.doctorScheduleSlot.create({
      data: {
        ...input,
        clinicId: input.mode === "ONLINE" ? null : input.clinicId,
        notes: input.notes || null,
      },
      include: slotInclude,
    });
  } catch (error) {
    if (hasErrorCode(error, "P2002")) {
      throw new AppError(
        409,
        "SCHEDULE_ALREADY_EXISTS",
        "Dokter ini sudah memiliki jadwal pada waktu tersebut.",
      );
    }
    throw error;
  }
}

export async function updateScheduleStatus(
  id: string,
  status: "AVAILABLE" | "BLOCKED",
) {
  const slot = await prisma.doctorScheduleSlot.findUnique({ where: { id } });
  if (!slot)
    throw new AppError(404, "SCHEDULE_NOT_FOUND", "Jadwal tidak ditemukan.");
  if (slot.status === "BOOKED") {
    throw new AppError(
      409,
      "SCHEDULE_ALREADY_BOOKED",
      "Jadwal yang sudah dipesan tidak dapat diblokir.",
    );
  }
  return prisma.doctorScheduleSlot.update({
    where: { id },
    data: { status },
    include: slotInclude,
  });
}

export function listActiveClinics() {
  return prisma.clinic.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
}

function isBookingTransitionAllowed(
  current: BookingStatus,
  next: BookingStatus,
) {
  if (current === next) return true;
  const transitions: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return transitions[current].includes(next);
}

function createBookingCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `GC-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasErrorCode(error: unknown, code: string): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function normalizeBookingAccess(input: BookingAccessInput) {
  const whatsapp = normalizeWhatsappNumber(input.whatsapp);
  if (!whatsapp) {
    throw new AppError(
      422,
      "INVALID_WHATSAPP",
      "Masukkan nomor WhatsApp Indonesia yang digunakan saat booking.",
    );
  }
  return { bookingCode: input.bookingCode.trim().toUpperCase(), whatsapp };
}

function bookingAccessError() {
  return new AppError(
    404,
    "BOOKING_NOT_FOUND",
    "Booking tidak ditemukan. Periksa kembali kode booking dan nomor WhatsApp Anda.",
  );
}

function buildPreConsultationSummary(
  session: {
    isEmergency: boolean;
    lead: {
      diabetesType: string | null;
      currentMedication: string | null;
      primaryComplaint: string | null;
      qualificationStatus: string | null;
    } | null;
    messages: Array<{ content: string }>;
  } | null,
  bookingComplaint?: string,
): Prisma.InputJsonValue {
  return {
    diabetesType: session?.lead?.diabetesType ?? null,
    currentMedication: session?.lead?.currentMedication ?? null,
    primaryComplaint:
      bookingComplaint || session?.lead?.primaryComplaint || null,
    qualificationStatus: session?.lead?.qualificationStatus ?? null,
    emergencyFlag: session?.isEmergency ?? false,
    recentPatientMessages:
      session?.messages.map((message) => message.content).reverse() ?? [],
    note: "Ringkasan otomatis dari informasi yang dinyatakan pasien; bukan diagnosis atau resep.",
  };
}

async function createBookingEvent(
  transaction: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorType: BookingActorType;
    actorLabel?: string;
    action: string;
    previousStatus?: BookingStatus;
    newStatus?: BookingStatus;
    details?: Prisma.InputJsonValue;
  },
) {
  await transaction.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      actorType: input.actorType,
      actorLabel: input.actorLabel,
      action: input.action,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      details: input.details,
    },
  });
}
