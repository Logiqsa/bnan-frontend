import type { ReactNode } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { isArabic } = useLanguage();
  return (
    <div data-dashboard-layout className="flex h-dvh overflow-hidden bg-background" dir={isArabic ? "rtl" : "ltr"}>
      <DashboardSidebar />
      <main data-scroll-container className="dashboard-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-16 md:p-6 md:pt-6" dir="ltr">
        <div dir={isArabic ? "rtl" : "ltr"}>{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
