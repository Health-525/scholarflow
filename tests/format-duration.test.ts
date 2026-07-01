import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  formatAppDuration,
  formatDuration,
  formatDurationShort,
  formatSeconds,
} from "@/lib/format-duration";

describe("format-duration", () => {
  // Feature: scholarflow-full-optimization, Property 5: formatDuration 系列函数输出等价性
  describe("Property 5: formatDuration 系列函数输出等价性", () => {
    it("formatDuration 对任意非负整数输出符合规格", () => {
      fc.assert(
        fc.property(fc.nat(10000), (totalMinutes) => {
          const result = formatDuration(totalMinutes);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          const expected = h > 0 ? `${h}小时 ${m}分钟` : `${m}分钟`;
          expect(result).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });

    it("formatDurationShort 对任意非负整数输出符合规格", () => {
      fc.assert(
        fc.property(fc.nat(10000), (totalMinutes) => {
          const result = formatDurationShort(totalMinutes);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          const expected = h > 0 ? `${h}h ${m}m` : `${m}m`;
          expect(result).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });

    it("formatAppDuration 对任意非负整数输出符合规格", () => {
      fc.assert(
        fc.property(fc.nat(10000), (seconds) => {
          const result = formatAppDuration(seconds);
          const expected =
            seconds < 60
              ? `${seconds}秒`
              : `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
          expect(result).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });

    it("formatSeconds 对任意非负整数输出符合规格", () => {
      fc.assert(
        fc.property(fc.nat(100000), (seconds) => {
          const result = formatSeconds(seconds);
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = seconds % 60;
          const expected =
            h > 0
              ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
              : `${m}:${String(s).padStart(2, "0")}`;
          expect(result).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe("边界值", () => {
    it("formatDuration(0) → 0分钟", () => {
      expect(formatDuration(0)).toBe("0分钟");
    });

    it("formatDurationShort(0) → 0m", () => {
      expect(formatDurationShort(0)).toBe("0m");
    });

    it("formatAppDuration(0) → 0秒", () => {
      expect(formatAppDuration(0)).toBe("0秒");
    });

    it("formatSeconds(0) → 0:00", () => {
      expect(formatSeconds(0)).toBe("0:00");
    });

    it("负数输入视为 0", () => {
      expect(formatDuration(-5)).toBe("0分钟");
      expect(formatDurationShort(-5)).toBe("0m");
      expect(formatAppDuration(-5)).toBe("0秒");
      expect(formatSeconds(-5)).toBe("0:00");
    });
  });
});
