import { createContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";
import { getStoredAuth, setStoredAuth } from "../utils/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    setStoredAuth(auth);
  }, [auth]);

  const value = useMemo(
    () => ({
      auth,
      user: auth?.account || null,
      role: auth?.role || auth?.account?.role || null,
      isAuthenticated: Boolean(auth?.token),
      async login(payload) {
        const next = await authService.login(payload);
        setAuth(next);
        return next;
      },
      async register(payload) {
        const next = await authService.register(payload);
        setAuth(next);
        return next;
      },
      async registerWorker(payload) {
        const next = await authService.registerWorker(payload);
        setAuth(next);
        return next;
      },
      logout() {
        authService.logout();
        setAuth(null);
      },
      refreshAccount(account) {
        setAuth((current) => (current ? { ...current, account } : current));
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
