import type { ZoomAccount } from "@/api/zoomAccountsApi";

export const getZoomAccountStatus = (account: ZoomAccount) => {
  if (!account.isActive) return "inactive" as const;
  if (account.isConfigured) return "ready" as const;
  return "pending" as const;
};

export const getZoomAccountCounters = (accounts: ZoomAccount[]) => ({
  total: accounts.length,
  active: accounts.filter((account) => account.isActive).length,
  ready: accounts.filter((account) => account.isActive && account.isConfigured).length,
  pending: accounts.filter((account) => account.isConfigured !== true).length,
});
