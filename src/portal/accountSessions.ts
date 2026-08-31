import type { PortalUser } from "@/api/types";

const SESSIONS_KEY = "bnan_remembered_accounts";

export interface RememberedAccount {
  user: PortalUser;
  token: string;
  refreshToken: string;
  lastUsedAt: string;
}

export const getRememberedAccounts = (): RememberedAccount[] => {
  try {
    const value = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item?.user?.id && item?.token && item?.refreshToken) : [];
  } catch {
    return [];
  }
};

export const rememberAccount = (account: RememberedAccount) => {
  const accounts = getRememberedAccounts().filter((item) => item.user.id !== account.user.id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([account, ...accounts].slice(0, 5)));
};

export const forgetAccount = (userId: string) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(getRememberedAccounts().filter((item) => item.user.id !== userId)));
};
