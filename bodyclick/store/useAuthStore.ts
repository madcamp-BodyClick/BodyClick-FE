import { create } from "zustand";

type AuthUser = {
  name: string;
  email: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (email) =>
    set({
      isAuthenticated: true,
      user: {
        name: email.split("@")[0] || "사용자",
        email,
      },
    }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));

// TODO: 실제 인증 및 토큰 관리는 BE와 연동하세요.
