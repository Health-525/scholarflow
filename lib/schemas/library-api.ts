import { z } from "zod";

export const reserveSeatBodySchema = z.object({
  lib_id: z.number().int().positive(),
  key: z.string().min(1),
});

export const releaseSeatBodySchema = z.object({
  libId: z.number().int().positive(),
  seatName: z.string().min(1),
});

export const cancelReserveBodySchema = z.object({
  sToken: z.string().min(1),
});

export const markMessagesBodySchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
  page: z.number().int().positive().optional(),
  num: z.number().int().positive().optional(),
  type: z.number().int().positive().optional(),
});

export const seatLayoutQuerySchema = z.object({
  lib_id: z.string().regex(/^\d+$/).transform(Number),
});

export const messagesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  num: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: z.string().regex(/^\d+$/).transform(Number).optional(),
});
