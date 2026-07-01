import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentAssignmentsFromCache } from "@/hooks/useQueries";
import * as mobileData from "@/lib/mobile-data";
import type { Assignment } from "@/types";

const assignmentsKey = ["assignments", "test-school", "test-user"] as const;

describe("getCurrentAssignmentsFromCache", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: scholarflow-full-optimization, Property 9: getCurrentAssignments 缓存语义正确性
  it("undefined 时调用 tryLocalApi 并返回本地数据", async () => {
    const local: Assignment[] = [
      { id: "local-1", subject: "数学", title: "", deadline: new Date().toISOString(), done: false, createdAt: new Date().toISOString() },
    ];
    const readDataSpy = vi.spyOn(mobileData, "readData").mockResolvedValueOnce(local);
    const queryClient = { getQueryData: vi.fn(() => undefined) };

    const result = await getCurrentAssignmentsFromCache(queryClient, assignmentsKey);

    expect(result).toEqual(local);
    expect(readDataSpy).toHaveBeenCalledWith("assignments");
    expect(readDataSpy).toHaveBeenCalledTimes(1);
  });

  it("null 时回退到 tryLocalApi", async () => {
    const local: Assignment[] = [
      { id: "local-1", subject: "数学", title: "", deadline: new Date().toISOString(), done: false, createdAt: new Date().toISOString() },
    ];
    const readDataSpy = vi.spyOn(mobileData, "readData").mockResolvedValueOnce(local);
    const queryClient = { getQueryData: vi.fn(() => null) };

    const result = await getCurrentAssignmentsFromCache(queryClient, assignmentsKey);

    expect(result).toEqual(local);
    expect(readDataSpy).toHaveBeenCalledWith("assignments");
  });

  it("[] 时直接返回空数组，不调用 tryLocalApi", async () => {
    const readDataSpy = vi.spyOn(mobileData, "readData");
    const queryClient = { getQueryData: vi.fn(() => []) };

    const result = await getCurrentAssignmentsFromCache(queryClient, assignmentsKey);

    expect(result).toEqual([]);
    expect(readDataSpy).not.toHaveBeenCalled();
  });

  it("非空数组时直接返回缓存，不调用 tryLocalApi", async () => {
    const cached: Assignment[] = [
      { id: "cached-1", subject: "英语", title: "", deadline: new Date().toISOString(), done: false, createdAt: new Date().toISOString() },
    ];
    const readDataSpy = vi.spyOn(mobileData, "readData");
    const queryClient = { getQueryData: vi.fn(() => cached) };

    const result = await getCurrentAssignmentsFromCache(queryClient, assignmentsKey);

    expect(result).toBe(cached);
    expect(readDataSpy).not.toHaveBeenCalled();
  });
});
