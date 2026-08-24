import type { RequestHandler } from "express";
import {
  adminBookingListQuerySchema,
  adminScheduleListQuerySchema,
  bookingAccessSchema,
  bookingCodeParamsSchema,
  bookingLookupSchema,
  bookingRescheduleSchema,
  createBookingSchema,
  createScheduleSchema,
  doctorScheduleParamsSchema,
  publicScheduleQuerySchema,
  updateBookingStatusSchema,
  updateScheduleStatusSchema,
} from "../validators/consultation.validator";
import { uuidParamsSchema } from "../validators/common";
import {
  cancelConsultationBooking,
  createConsultationBooking,
  createDoctorSchedule,
  getConsultationStats,
  listActiveClinics,
  listAdminBookings,
  listAdminSchedules,
  listPublicDoctorSchedule,
  lookupConsultationBooking,
  requestBookingDataDeletion,
  rescheduleConsultationBooking,
  updateBookingStatus,
  updateScheduleStatus,
} from "../services/consultation.service";
import { CHAT_SESSION_COOKIE_NAME } from "../utils/chat-session";

export const publicDoctorSchedule: RequestHandler = async (req, res) => {
  const { identifier } = doctorScheduleParamsSchema.parse(req.params);
  const query = publicScheduleQuerySchema.parse(req.query);
  const data = await listPublicDoctorSchedule(identifier, query);
  res.status(200).json({ data });
};

export const createBooking: RequestHandler = async (req, res) => {
  const input = createBookingSchema.parse(req.body);
  const token =
    typeof req.cookies?.[CHAT_SESSION_COOKIE_NAME] === "string"
      ? req.cookies[CHAT_SESSION_COOKIE_NAME]
      : undefined;
  const data = await createConsultationBooking(input, token);
  res.status(201).json({ data });
};

export const lookupBooking: RequestHandler = async (req, res) => {
  const input = bookingLookupSchema.parse(req.body);
  const data = await lookupConsultationBooking(input);
  res.status(200).json({ data });
};

export const cancelBooking: RequestHandler = async (req, res) => {
  const { bookingCode } = bookingCodeParamsSchema.parse(req.params);
  const { whatsapp } = bookingAccessSchema.parse(req.body);
  const data = await cancelConsultationBooking({ bookingCode, whatsapp });
  res.status(200).json({ data });
};

export const rescheduleBooking: RequestHandler = async (req, res) => {
  const { bookingCode } = bookingCodeParamsSchema.parse(req.params);
  const { whatsapp, slotId } = bookingRescheduleSchema.parse(req.body);
  const data = await rescheduleConsultationBooking({
    bookingCode,
    whatsapp,
    slotId,
  });
  res.status(200).json({ data });
};

export const requestBookingDeletion: RequestHandler = async (req, res) => {
  const { bookingCode } = bookingCodeParamsSchema.parse(req.params);
  const { whatsapp } = bookingAccessSchema.parse(req.body);
  const data = await requestBookingDataDeletion({ bookingCode, whatsapp });
  res.status(200).json({ data });
};

export const adminBookings: RequestHandler = async (req, res) => {
  const query = adminBookingListQuerySchema.parse(req.query);
  const result = await listAdminBookings(query);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const adminConsultationStats: RequestHandler = async (_req, res) => {
  const data = await getConsultationStats();
  res.status(200).json({ data });
};

export const adminUpdateBooking: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const { status } = updateBookingStatusSchema.parse(req.body);
  const data = await updateBookingStatus(id, status, req.authUser?.name);
  res.status(200).json({ data });
};

export const adminSchedules: RequestHandler = async (req, res) => {
  const query = adminScheduleListQuerySchema.parse(req.query);
  const result = await listAdminSchedules(query);
  res.status(200).json({ data: result.items, meta: result.pagination });
};

export const adminCreateSchedule: RequestHandler = async (req, res) => {
  const input = createScheduleSchema.parse(req.body);
  const data = await createDoctorSchedule(input);
  res.status(201).json({ data });
};

export const adminUpdateSchedule: RequestHandler = async (req, res) => {
  const { id } = uuidParamsSchema.parse(req.params);
  const { status } = updateScheduleStatusSchema.parse(req.body);
  const data = await updateScheduleStatus(id, status);
  res.status(200).json({ data });
};

export const adminClinics: RequestHandler = async (_req, res) => {
  const data = await listActiveClinics();
  res.status(200).json({ data });
};
