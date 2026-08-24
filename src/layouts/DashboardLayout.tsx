import type { ReactNode } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { isArabic } = useLanguage();
  return (
    <div className="flex min-h-screen bg-background" dir={isArabic ? "rtl" : "ltr"}>
      <DashboardSidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 md:p-6 md:pt-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
