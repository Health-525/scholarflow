import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  libraryDataSchema,
  libraryLayoutSchema,
  libraryReserveStatusSchema,
  libraryUserStatusSchema,
} from "@/lib/schemas/library";
import type {
  LibraryDataInput,
  LibraryLayoutInput,
  LibraryReserveStatusInput,
  LibraryUserStatusInput,
} from "@/lib/schemas/library";

class JWTExpiredError extends Error {
  constructor() {
    super("JWT_EXPIRED");
    this.name = "JWTExpiredError";
  }
}

const LIBRARY_CANCEL_TOKEN_KEY = "scholarflow-library-cancel-token";

function extractCancelToken(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if (typeof obj.sToken === "string") return obj.sToken;
    if (typeof obj.token === "string") return obj.token;
    if (typeof obj.cancelToken === "string") return obj.cancelToken;
  }
  return null;
}

function saveCancelToken(result: unknown) {
  const token = extractCancelToken(result);
  if (token) {
    try { localStorage.setItem(LIBRARY_CANCEL_TOKEN_KEY, token); } catch {}
  }
}

function loadCancelToken(): string | null {
  try { return localStorage.getItem(LIBRARY_CANCEL_TOKEN_KEY); } catch { return null; }
}

function clearCancelToken() {
  try { localStorage.removeItem(LIBRARY_CANCEL_TOKEN_KEY); } catch {}
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
  messages: (type: number) => [...libraryQueryKeys.all, "messages", String(type)] as const,
  layout: (libId: string) => [...libraryQueryKeys.all, "layout", libId] as const,
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

export interface LibraryMessage {
  title: string;
  content: string;
  create_time: string;
  isread: number;
  isused: number;
}

export function useLibraryMessages(type = 1, enabled = true) {
  return useQuery<{ messages: LibraryMessage[] }, Error>({
    queryKey: libraryQueryKeys.messages(type),
    queryFn: async () => {
      const r = await fetch(`/api/library/messages?page=1&num=20&type=${type}`);
      if (r.status === 401) throw new JWTExpiredError();
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error || `请求失败 (${r.status})`);
      }
      const json = await r.json();
      return { messages: Array.isArray(json.messages) ? json.messages : [] };
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled,
  });
}

export function useLibraryLayout(libId: string | null) {
  return useQuery<LibraryLayoutInput, Error>({
    queryKey: libraryQueryKeys.layout(libId ?? ""),
    queryFn: () => fetch(`/api/library/seat-layout?lib_id=${libId}`).then((r) => handleResponse(r, libraryLayoutSchema)),
    enabled: !!libId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useReserveSeat() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data?: unknown }, Error, { libId: number; key: string }>({
    mutationFn: async ({ libId, key }) => {
      const r = await fetch("/api/library/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lib_id: libId, key }),
      });
      if (r.status === 401) throw new JWTExpiredError();
      const json = await r.json().catch(() => ({}));
      if (json.error) throw new Error(json.error);
      if (!json.success) throw new Error(`未知响应: ${JSON.stringify(json)}`);
      return json;
    },
    onSuccess: async (data) => {
      // 保存取消预约用的 sToken（有效期仅约 2 分钟）
      saveCancelToken(data.data);
      // 立即刷新当前预约和用户信息
      await Promise.all([
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.reserveStatus() }),
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.userStatus() }),
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.data() }),
      ]);
    },
  });
}

export function useCancelReserve() {
  const queryClient = useQueryClient();
  return useMutation<Record<string, unknown>, Error, { sToken?: string }>({
    mutationFn: async ({ sToken } = {}) => {
      // 取消预约必须使用预约成功时返回的 sToken（reserve-status 里的 token 不是它）
      const cancelToken = sToken || loadCancelToken();
      if (!cancelToken) {
        throw new Error("取消令牌已过期或不存在，请在官方页面取消，或重新预约");
      }

      const r = await fetch("/api/library/cancel-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sToken: cancelToken }),
      });
      if (r.status === 401) throw new JWTExpiredError();
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error || "取消失败");
      }
      return r.json();
    },
    onSuccess: async () => {
      clearCancelToken();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.reserveStatus() }),
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.userStatus() }),
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.data() }),
      ]);
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.reserveStatus() }),
        queryClient.refetchQueries({ queryKey: libraryQueryKeys.userStatus() }),
      ]);
    },
  });
}

export { JWTExpiredError };
