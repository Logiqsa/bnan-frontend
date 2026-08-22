import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { tokenStore } from "@/api/client";
import type { PortalUser } from "@/api/types";

const USER_KEY = "bnan_portal_user";
interface Value { user: PortalUser | null; loading: boolean; login: (email: string, password: string) => Promise<PortalUser>; logout: () => void; }
const Context = createContext<Value | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || !tokenStore.get()) { setLoading(false); return; }
    const saved = JSON.parse(raw) as PortalUser;
    authApi.profile().then(() => setUser(saved)).catch(() => { tokenStore.clear(); localStorage.removeItem(USER_KEY); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const onSessionExpired = () => { localStorage.removeItem(USER_KEY); setUser(null); };
    window.addEventListener("bnan:session-expired", onSessionExpired);
    return () => window.removeEventListener("bnan:session-expired", onSessionExpired);
  }, []);
  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (!["teacher", "student", "admin"].includes(response.data.role)) throw Object.assign(new Error("هذا النوع من الحسابات غير مدعوم."), { code: "WRONG_ROLE" });
    tokenStore.set(response.token, response.refreshToken); localStorage.setItem(USER_KEY, JSON.stringify(response.data)); setUser(response.data);
    return response.data;
  };
  const logout = () => { tokenStore.clear(); localStorage.removeItem(USER_KEY); setUser(null); };
  return <Context.Provider value={{ user, loading, login, logout }}>{children}</Context.Provider>;
}
export const usePortalAuth = () => { const value = useContext(Context); if (!value) throw new Error("PortalAuthProvider is missing"); return value; };
