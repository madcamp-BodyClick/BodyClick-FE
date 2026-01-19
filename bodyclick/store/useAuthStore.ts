import { create } from "zustand";

type AuthUser = {
  name: string;
  email: string;
  gender?: string;
  birthdate?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string) => void;
  logout: () => void;
  updateProfile: (profile: Partial<AuthUser>) => void;
  syncFromSession: (sessionUser: { email: string; name?: string }) => void;
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
        gender: "",
        birthdate: "",
      },
    }),
  logout: () => set({ isAuthenticated: false, user: null }),
  updateProfile: (profile) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...profile } : state.user,
    })),
  syncFromSession: (sessionUser) =>
    set((state) => {
      const fallbackName =
        sessionUser.name ?? sessionUser.email.split("@")[0] ?? "사용자";
      const baseUser = state.user ?? {
        name: fallbackName,
        email: sessionUser.email,
        gender: "",
        birthdate: "",
      };
      return {
        isAuthenticated: true,
        user: {
          ...baseUser,
          ...sessionUser,
          name: sessionUser.name ?? baseUser.name,
          email: sessionUser.email,
        },
      };
    }),
}));

// TODO: 실제 인증 및 토큰 관리는 BE와 연동하세요.
