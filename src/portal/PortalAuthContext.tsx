import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { tokenStore } from "@/api/client";
import type { PortalUser } from "@/api/types";
import { forgetAccount, getRememberedAccounts, rememberAccount, type RememberedAccount } from "./accountSessions";

const USER_KEY = "bnan_portal_user";
interface Value { user: PortalUser | null; loading: boolean; rememberedAccounts: RememberedAccount[]; login: (email: string, password: string, remember?: boolean) => Promise<PortalUser>; switchAccount: (userId: string) => void; prepareAddAccount: () => void; forgetRememberedAccount: (userId: string) => void; updateCurrentUser: (patch: Partial<PortalUser>) => void; logout: () => void; }
const Context = createContext<Value | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(getRememberedAccounts);
  useEffect(() => {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw || !tokenStore.get() || !tokenStore.getRefresh()) { setLoading(false); return; }
    try {
      const saved = JSON.parse(raw) as PortalUser;
      setUser(saved);
      setLoading(false);
      // التحقق يتم في الخلفية. أخطاء الشبكة العادية لا تنهي الجلسة؛
      // apiRequest يطلق session-expired فقط إذا رفض الخادم refresh token.
      // Admin accounts do not necessarily have a user profile document.
      // Their protected API requests still validate the stored access token.
      if (saved.role !== "admin") void authApi.profile().catch(() => undefined);
    } catch {
      // بيانات مستخدم تالفة ليست جلسة قابلة للاستعادة، لكن لا نمس التوكنات هنا.
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const onSessionExpired = () => { localStorage.removeItem(USER_KEY); sessionStorage.removeItem(USER_KEY); setUser(null); };
    window.addEventListener("bnan:session-expired", onSessionExpired);
    return () => window.removeEventListener("bnan:session-expired", onSessionExpired);
  }, []);
  const login = async (email: string, password: string, remember = false) => {
    const response = await authApi.login(email, password);
    if (!["teacher", "student", "supervisor", "admin"].includes(response.data.role)) throw Object.assign(new Error("هذا النوع من الحسابات غير مدعوم."), { code: "WRONG_ROLE" });
    tokenStore.set(response.token, response.refreshToken, remember);
    const userStorage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    userStorage.setItem(USER_KEY, JSON.stringify(response.data)); otherStorage.removeItem(USER_KEY); setUser(response.data);
    if (remember) {
      rememberAccount({ user: response.data, token: response.token, refreshToken: response.refreshToken, lastUsedAt: new Date().toISOString() });
      setRememberedAccounts(getRememberedAccounts());
    }
    return response.data;
  };
  const switchAccount = (userId: string) => {
    if (user) {
      const currentSaved = getRememberedAccounts().find((item) => item.user.id === user.id);
      const currentToken = tokenStore.get();
      const currentRefreshToken = tokenStore.getRefresh();
      if (currentSaved && currentToken && currentRefreshToken) {
        rememberAccount({ user, token: currentToken, refreshToken: currentRefreshToken, lastUsedAt: new Date().toISOString() });
      }
    }
    const account = getRememberedAccounts().find((item) => item.user.id === userId);
    if (!account) return;
    tokenStore.set(account.token, account.refreshToken, true);
    localStorage.setItem(USER_KEY, JSON.stringify(account.user)); sessionStorage.removeItem(USER_KEY);
    rememberAccount({ ...account, lastUsedAt: new Date().toISOString() });
    setRememberedAccounts(getRememberedAccounts()); setUser(account.user);
  };
  const prepareAddAccount = () => {
    const token = tokenStore.get();
    const refreshToken = tokenStore.getRefresh();
    if (!user || !token || !refreshToken) return;
    rememberAccount({ user, token, refreshToken, lastUsedAt: new Date().toISOString() });
    setRememberedAccounts(getRememberedAccounts());
  };
  const forgetRememberedAccount = (userId: string) => {
    forgetAccount(userId);
    setRememberedAccounts(getRememberedAccounts());
  };
  const updateCurrentUser = (patch: Partial<PortalUser>) => {
    if (!user) return;
    const updated = { ...user, ...patch };
    const storage = sessionStorage.getItem(USER_KEY) ? sessionStorage : localStorage;
    storage.setItem(USER_KEY, JSON.stringify(updated));
    const saved = getRememberedAccounts().find((item) => item.user.id === user.id);
    if (saved) rememberAccount({ ...saved, user: updated, lastUsedAt: new Date().toISOString() });
    setRememberedAccounts(getRememberedAccounts()); setUser(updated);
  };
  const logout = () => {
    tokenStore.clear(); localStorage.removeItem(USER_KEY); sessionStorage.removeItem(USER_KEY);
    setRememberedAccounts(getRememberedAccounts()); setUser(null);
  };
  return <Context.Provider value={{ user, loading, rememberedAccounts, login, switchAccount, prepareAddAccount, forgetRememberedAccount, updateCurrentUser, logout }}>{children}</Context.Provider>;
}
export const usePortalAuth = () => { const value = useContext(Context); if (!value) throw new Error("PortalAuthProvider is missing"); return value; };
