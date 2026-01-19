"use client";

import { useEffect } from "react";
import { fetchCurrentUser } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";
import { useBodyMapStore } from "../store/useBodyMapStore";

const AuthSessionSync = () => {
  const setUserFromApi = useAuthStore((state) => state.setUserFromApi);
  const clearUser = useAuthStore((state) => state.clearUser);
  const loadSystems = useBodyMapStore((state) => state.loadSystems);

  useEffect(() => {
    let isActive = true;
    const bootstrap = async () => {
      await loadSystems();
      const response = await fetchCurrentUser();
      if (!isActive) {
        return;
      }
      if (response.ok && response.data?.success) {
        setUserFromApi(response.data.data);
        return;
      }
      if (response.status === 401) {
        clearUser();
      }
    };
    bootstrap();
    return () => {
      isActive = false;
    };
  }, [clearUser, loadSystems, setUserFromApi]);

  return null;
};

export default AuthSessionSync;
