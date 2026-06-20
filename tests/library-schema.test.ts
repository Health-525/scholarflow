import { describe, it, expect } from "vitest";

import {
  libraryDataSchema,
  libraryUserStatusSchema,
  libraryReserveStatusSchema,
} from "../lib/schemas/library";

describe("library schemas", () => {
  it("parses vpn-proxy data with missing lib_type", () => {
    const data = {
      updated: new Date().toISOString(),
      summary: { total: 1000, used: 500, avail: 500, rate: 0.5 },
      libs: [
        {
          lib_id: 1,
          lib_name: "图书馆A区",
          lib_floor: "1F",
          is_open: true,
          lib_group_id: 10,
          lib_rt: {
            seats_total: 100,
            seats_used: 50,
            seats_booking: 10,
            seats_has: 100,
            reserve_ttl: 1800,
            open_time_str: "08:00",
            close_time_str: "22:00",
            advance_booking: "30",
          },
        },
        {
          lib_id: "2",
          lib_name: "图书馆B区",
          lib_floor: "2F",
          is_open: "true",
          lib_type: "3",
          lib_group_id: "20",
          lib_rt: {
            seats_total: "200",
            seats_used: "100",
            seats_booking: "20",
            seats_has: "200",
            reserve_ttl: "1800",
            open_time_str: "08:00",
            close_time_str: "22:00",
            advance_booking: "30",
          },
        },
      ],
    };

    const result = libraryDataSchema.parse(data);
    expect(result.libs[0].lib_type).toBe(0);
    expect(result.libs[1].lib_type).toBe(3);
  });

  it("parses user-status with partial reserve", () => {
    const data = {
      reserve: {
        status: 1,
        token: "abc123",
        seat_name: "A01",
        lib_name: "图书馆A区",
      },
      rank: 5,
    };

    const result = libraryUserStatusSchema.parse(data);
    expect(result.reserve?.status).toBe(1);
    expect(result.reserve?.lib_id).toBe(0);
  });

  it("parses reserve-status with null reserve", () => {
    const result = libraryReserveStatusSchema.parse({ reserve: null });
    expect(result.reserve).toBeNull();
  });
});
