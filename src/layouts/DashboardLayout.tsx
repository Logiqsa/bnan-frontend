import type { ReactNode } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import NotificationsBell from "@/components/NotificationsBell";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationsProvider from "@/contexts/NotificationsProvider";

const NotificationsEnabledContent = ({ children }: { children: ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
);

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { isArabic } = useLanguage();
  const { user } = usePortalAuth();
  const content = (
    <div data-dashboard-layout className="flex h-dvh overflow-hidden bg-background" dir={isArabic ? "rtl" : "ltr"}>
      <DashboardSidebar />
      <main data-scroll-container className="dashboard-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-16 md:p-6 md:pt-6" dir="ltr">
        <div dir={isArabic ? "rtl" : "ltr"}>
          {(user?.role === "admin" || user?.role === "teacher" || user?.role === "student") && (
            <div className="mb-3 flex justify-end gap-2">
              {user.role === "admin" && (
                <Button asChild variant="outline" size="icon" className="bg-background shadow-sm">
                  <Link to="/admin/client-errors" aria-label={isArabic ? "فتح سجل أخطاء التطبيقات" : "Open client error logs"} title={isArabic ? "سجل أخطاء التطبيقات" : "Client error logs"}>
                    <AlertTriangle className="h-5 w-5" />
                  </Link>
                </Button>
              )}
              <NotificationsBell role={user.role} />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
  return user && ["admin", "teacher", "student"].includes(user.role)
    ? <NotificationsEnabledContent>{content}</NotificationsEnabledContent>
    : content;
};

export default DashboardLayout;
