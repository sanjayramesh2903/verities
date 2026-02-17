import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getMe, logout as apiLogout, BASE, type AuthUser } from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Check for OAuth redirect result in URL params
    const params = new URLSearchParams(window.location.search);
    const loginResult = params.get("login");
    if (loginResult) {
      // Remove param from URL without reload
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
    }

    // Always attempt to restore session from cookie
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = `${BASE}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
