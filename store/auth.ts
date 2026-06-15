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
  /** 用户名（兼容旧代码） */
  username: string | null;
  /** 旧 token 字段（兼容旧代码，现在为空） */
  token: string | null;
  /** 设置认证信息 */
  setAuth: (schoolId: string, userId: string) => void;
  /** 清除认证信息（兼容旧代码的 clearToken） */
  clearAuth: () => void;
  /** 清除 token（别名 clearAuth） */
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      schoolId: null,
      isAuthenticated: false,
      userId: null,
      username: null,
      token: null,

      setAuth: (schoolId: string, userId: string) => {
        set({ schoolId, userId, username: userId, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ schoolId: null, userId: null, username: null, isAuthenticated: false, token: null });
      },

      clearToken: () => {
        set({ schoolId: null, userId: null, username: null, isAuthenticated: false, token: null });
      },
    }),
    {
      name: "sf_auth",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        schoolId: state.schoolId,
        userId: state.userId,
        username: state.username,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
