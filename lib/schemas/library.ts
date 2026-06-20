import { z } from "zod";

export const libraryRoomSchema = z.object({
  lib_id: z.coerce.number(),
  lib_name: z.string(),
  lib_floor: z.string(),
  is_open: z.coerce.boolean(),
  lib_type: z.coerce.number().optional().default(0),
  lib_group_id: z.coerce.number(),
  lib_rt: z.object({
    seats_total: z.coerce.number(),
    seats_used: z.coerce.number(),
    seats_booking: z.coerce.number(),
    seats_has: z.coerce.number(),
    reserve_ttl: z.coerce.number(),
    open_time_str: z.string(),
    close_time_str: z.string(),
    advance_booking: z.string(),
  }),
  lib_layout: z
    .object({
      seats_total: z.coerce.number(),
      seats_used: z.coerce.number(),
      seats_booking: z.coerce.number(),
      max_x: z.coerce.number(),
      max_y: z.coerce.number(),
      seats: z.array(
        z.object({
          x: z.coerce.number(),
          y: z.coerce.number(),
          key: z.string(),
          type: z.coerce.number(),
          name: z.string(),
          seat_status: z.coerce.number(),
          status: z.coerce.boolean(),
        })
      ),
    })
    .optional(),
});

export const libraryDataSchema = z.object({
  updated: z.string(),
  summary: z.object({
    total: z.coerce.number(),
    used: z.coerce.number(),
    avail: z.coerce.number(),
    rate: z.coerce.number(),
  }),
  libs: z.array(libraryRoomSchema),
});

// 不同 API 返回的 reserve 对象字段可能不同（user-status 只返回部分字段），全部设为可选
// date 可能是 Unix 时间戳数字或日期字符串
export const libraryReserveSchema = z.object({
  lib_id: z.coerce.number().optional().default(0),
  seat_key: z.string().optional().default(""),
  seat_name: z.string().optional().default(""),
  lib_name: z.string().optional().default(""),
  status: z.coerce.number().optional().default(0),
  user_id: z.coerce.number().optional().default(0),
  date: z.union([z.number(), z.string()]).optional().default(""),
  token: z.string().optional().default(""),
});

export const libraryUserStatusSchema = z.object({
  reserve: libraryReserveSchema.nullable(),
  rank: z.coerce.number().nullable(),
});

export const libraryReserveStatusSchema = z.object({
  reserve: libraryReserveSchema.nullable(),
});

export const libraryLayoutSchema = z.object({
  lib_id: z.coerce.number(),
  lib_name: z.string(),
  lib_floor: z.string(),
  lib_rt: z.object({
    seats_total: z.coerce.number(),
    seats_used: z.coerce.number(),
    seats_has: z.coerce.number(),
    open_time_str: z.string(),
    close_time_str: z.string(),
  }),
  lib_layout: z.object({
    seats: z.array(
      z.object({
        x: z.coerce.number(),
        y: z.coerce.number(),
        key: z.string(),
        name: z.string().nullable(),
        seat_status: z.coerce.number(),
        status: z.coerce.boolean(),
      })
    ),
  }),
});

export type LibraryDataInput = z.infer<typeof libraryDataSchema>;
export type LibraryUserStatusInput = z.infer<typeof libraryUserStatusSchema>;
export type LibraryReserveStatusInput = z.infer<typeof libraryReserveStatusSchema>;
export type LibraryLayoutInput = z.infer<typeof libraryLayoutSchema>;
