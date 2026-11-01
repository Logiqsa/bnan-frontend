import type { ReactNode } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import NotificationsBell from "@/components/NotificationsBell";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationsProvider from "@/contexts/NotificationsProvider";
import { TIME_ZONE_OPTIONS, useTimeZone } from "@/contexts/TimeZoneContext";

const NotificationsEnabledContent = ({ children }: { children: ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
);

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { isArabic, pick } = useLanguage();
  const { timeZone } = useTimeZone();
  const selectedTimeZone = TIME_ZONE_OPTIONS.find((option) => option.value === timeZone);
  const { user } = usePortalAuth();
  const content = (
    <div data-dashboard-layout className="flex h-dvh overflow-hidden bg-background" dir={isArabic ? "rtl" : "ltr"}>
      <DashboardSidebar />
      <main data-scroll-container className="dashboard-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-16 md:p-6 md:pt-6" dir="ltr">
        <div dir={isArabic ? "rtl" : "ltr"}>
          {(user?.role === "admin" || user?.role === "teacher" || user?.role === "student" || user?.role === "supervisor") && (
            <div className="mb-3 flex justify-start gap-2" dir="ltr">
              <NotificationsBell role={user.role} />
              <div
                dir={isArabic ? "rtl" : "ltr"}
                className="inline-flex h-10 max-w-[min(70vw,18rem)] items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs text-muted-foreground shadow-sm sm:px-3"
                title={pick("تُعرض جميع المواعيد حسب المنطقة الزمنية المختارة", "All times use your selected time zone")}
              >
                <Clock3 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {pick("الأوقات حسب توقيت", "Times in")} {" "}
                  <strong className="font-bold text-foreground">
                    {isArabic ? selectedTimeZone?.ar : selectedTimeZone?.en}
                  </strong>
                </span>
              </div>
              {user.role === "admin" && (
                <Button asChild variant="outline" size="icon" className="bg-background shadow-sm">
                  <Link to="/admin/client-errors" aria-label={isArabic ? "فتح سجل أخطاء التطبيقات" : "Open client error logs"} title={isArabic ? "سجل أخطاء التطبيقات" : "Client error logs"}>
                    <AlertTriangle className="h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
  return user && ["admin", "teacher", "student", "supervisor"].includes(user.role)
    ? <NotificationsEnabledContent>{content}</NotificationsEnabledContent>
    : content;
};

export default DashboardLayout;
