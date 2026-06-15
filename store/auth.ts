import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const safeStorage = {
  getItem: (name: string) =>
    typeof window !== "undefined" ? window.localStorage.getItem(name) : null,
  setItem: (name: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

interface AuthState {
  /** 已选择的学校 ID (e.g. "njtech") */
  schoolId: string | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 用户 ID (学号) */
  userId: string | null;
  /** 设置认证信息 */
  setAuth: (schoolId: string, userId: string) => void;
  /** 清除认证信息 */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      schoolId: null,
      isAuthenticated: false,
      userId: null,

      setAuth: (schoolId: string, userId: string) => {
        set({ schoolId, userId, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ schoolId: null, userId: null, isAuthenticated: false });
      },
    }),
    {
      name: "sf_auth",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        schoolId: state.schoolId,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
