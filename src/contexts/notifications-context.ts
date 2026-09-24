import { createContext, useContext } from "react";
import type { useNotifications } from "@/hooks/useNotifications";

type NotificationsState = ReturnType<typeof useNotifications>;

export const NotificationsContext = createContext<NotificationsState | null>(null);

export const useNotificationsContext = () => {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotificationsContext must be used inside NotificationsProvider");
  return value;
};
