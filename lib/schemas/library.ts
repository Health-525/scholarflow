import { z } from "zod";

export const libraryRoomSchema = z.object({
  lib_id: z.number(),
  lib_name: z.string(),
  lib_floor: z.string(),
  is_open: z.boolean(),
  lib_type: z.number(),
  lib_group_id: z.number(),
  lib_rt: z.object({
    seats_total: z.number(),
    seats_used: z.number(),
    seats_booking: z.number(),
    seats_has: z.number(),
    reserve_ttl: z.number(),
    open_time_str: z.string(),
    close_time_str: z.string(),
    advance_booking: z.string(),
  }),
  lib_layout: z
    .object({
      seats_total: z.number(),
      seats_used: z.number(),
      seats_booking: z.number(),
      max_x: z.number(),
      max_y: z.number(),
      seats: z.array(
        z.object({
          x: z.number(),
          y: z.number(),
          key: z.string(),
          type: z.number(),
          name: z.string(),
          seat_status: z.number(),
          status: z.boolean(),
        })
      ),
    })
    .optional(),
});

export const libraryDataSchema = z.object({
  updated: z.string(),
  summary: z.object({
    total: z.number(),
    used: z.number(),
    avail: z.number(),
    rate: z.number(),
  }),
  libs: z.array(libraryRoomSchema),
});

export const libraryReserveSchema = z.object({
  lib_id: z.number(),
  seat_key: z.string(),
  seat_name: z.string(),
  lib_name: z.string(),
  status: z.number(),
  user_id: z.number(),
  date: z.string(),
  token: z.string(),
});

export const libraryUserStatusSchema = z.object({
  reserve: libraryReserveSchema.nullable(),
  rank: z.number().nullable(),
});

export const libraryReserveStatusSchema = z.object({
  reserve: libraryReserveSchema.nullable(),
});

export const libraryLayoutSchema = z.object({
  lib_id: z.number(),
  lib_name: z.string(),
  lib_floor: z.string(),
  lib_rt: z.object({
    seats_total: z.number(),
    seats_used: z.number(),
    seats_has: z.number(),
    open_time_str: z.string(),
    close_time_str: z.string(),
  }),
  lib_layout: z.object({
    seats: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        key: z.string(),
        name: z.string().nullable(),
        seat_status: z.number(),
        status: z.boolean(),
      })
    ),
  }),
});

export type LibraryRoomInput = z.infer<typeof libraryRoomSchema>;
export type LibraryDataInput = z.infer<typeof libraryDataSchema>;
export type LibraryReserveInput = z.infer<typeof libraryReserveSchema>;
export type LibraryUserStatusInput = z.infer<typeof libraryUserStatusSchema>;
export type LibraryReserveStatusInput = z.infer<typeof libraryReserveStatusSchema>;
export type LibraryLayoutInput = z.infer<typeof libraryLayoutSchema>;
