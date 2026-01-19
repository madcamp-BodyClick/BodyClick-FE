import { create } from "zustand";
import type { UserProfile } from "../lib/api";

export type AuthUser = {
  id?: string;
  name?: string | null;
  email: string;
  gender?: "MALE" | "FEMALE" | null;
  birthdate?: string | null;
  image?: string | null;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  setUserFromApi: (user: UserProfile) => void;
  clearUser: () => void;
  updateProfile: (profile: Partial<AuthUser>) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUserFromApi: (user) =>
    set({
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        gender: user.gender ?? null,
        birthdate: user.birth_date ?? null,
        image: user.image ?? null,
      },
    }),
  clearUser: () => set({ isAuthenticated: false, user: null }),
  updateProfile: (profile) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...profile } : state.user,
    })),
}));
