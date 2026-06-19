import { useAuthStore } from "@/store/auth";

export function getCurrentAuth() {
  if (typeof window === "undefined") {
    return { schoolId: null as string | null, userId: null as string | null };
  }
  const { schoolId, userId, username } = useAuthStore.getState();
  return {
    schoolId,
    userId: userId || username || null,
  };
}

export function getAuthParams(): string {
  const { schoolId, userId } = getCurrentAuth();
  const params = new URLSearchParams();
  if (schoolId) params.set("schoolId", schoolId);
  if (userId) params.set("userId", userId);
  return params.toString();
}
