import type { ReactNode } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import NotificationsBell from "@/components/NotificationsBell";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 md:p-6 md:pt-6">
        <div className="flex justify-end mb-2">
          <NotificationsBell />
        </div>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
