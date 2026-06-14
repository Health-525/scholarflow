import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  libraryDataSchema,
  libraryReserveStatusSchema,
  libraryUserStatusSchema,
} from "@/lib/schemas/library";
import type {
  LibraryDataInput,
  LibraryReserveInput,
  LibraryReserveStatusInput,
  LibraryUserStatusInput,
} from "@/lib/schemas/library";

class JWTExpiredError extends Error {
  constructor() {
    super("JWT_EXPIRED");
    this.name = "JWTExpiredError";
  }
}

async function handleResponse<T>(r: Response, schema: import("zod").ZodType<T>): Promise<T> {
  if (r.status === 401) throw new JWTExpiredError();
  if (!r.ok) {
    const json = await r.json().catch(() => ({}));
    throw new Error(json.error || `请求失败 (${r.status})`);
  }
  const json = await r.json();
  return schema.parse(json);
}

export const libraryQueryKeys = {
  all: ["library"] as const,
  data: () => [...libraryQueryKeys.all, "data"] as const,
  userStatus: () => [...libraryQueryKeys.all, "user-status"] as const,
  reserveStatus: () => [...libraryQueryKeys.all, "reserve-status"] as const,
};

export function useLibraryData(enabled = true) {
  return useQuery<LibraryDataInput, Error>({
    queryKey: libraryQueryKeys.data(),
    queryFn: () => fetch("/api/vpn-proxy").then((r) => handleResponse(r, libraryDataSchema)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled,
  });
}

export function useLibraryUserStatus(enabled = true) {
  return useQuery<LibraryUserStatusInput, Error>({
    queryKey: libraryQueryKeys.userStatus(),
    queryFn: () =>
      fetch("/api/library/user-status").then((r) => handleResponse(r, libraryUserStatusSchema)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled,
  });
}

export function useLibraryReserveStatus(enabled = true) {
  return useQuery<LibraryReserveStatusInput, Error>({
    queryKey: libraryQueryKeys.reserveStatus(),
    queryFn: () =>
      fetch("/api/library/reserve-status").then((r) =>
        handleResponse(r, libraryReserveStatusSchema)
      ),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    enabled,
  });
}

export function useCancelReserve() {
  const queryClient = useQueryClient();
  return useMutation<Record<string, unknown>, Error, { sToken: string }>({
    mutationFn: async ({ sToken }) => {
      const r = await fetch("/api/library/cancel-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sToken }),
      });
      if (r.status === 401) throw new JWTExpiredError();
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error || "取消失败");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.reserveStatus() });
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.data() });
    },
  });
}

export function useHoldSeat() {
  const queryClient = useQueryClient();
  return useMutation<Record<string, unknown>, Error>({
    mutationFn: async () => {
      const r = await fetch("/api/library/hold-seat", { method: "POST" });
      if (r.status === 401) throw new JWTExpiredError();
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error || "暂离失败");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.reserveStatus() });
    },
  });
}

export { JWTExpiredError };
