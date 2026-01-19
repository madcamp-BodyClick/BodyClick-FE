"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "../store/useAuthStore";

const AuthSessionSync = () => {
  const { data, status } = useSession();
  const syncFromSession = useAuthStore((state) => state.syncFromSession);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (status === "authenticated" && data?.user?.email) {
      syncFromSession({
        email: data.user.email,
        name: data.user.name ?? undefined,
      });
      return;
    }
    if (status === "unauthenticated") {
      logout();
    }
  }, [data?.user?.email, data?.user?.name, logout, status, syncFromSession]);

  return null;
};

export default AuthSessionSync;
