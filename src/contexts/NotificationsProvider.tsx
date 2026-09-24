import type { ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { NotificationsContext } from "@/contexts/notifications-context";

export default function NotificationsProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const notifications = useNotifications(language);
  return <NotificationsContext.Provider value={notifications}>{children}</NotificationsContext.Provider>;
}
