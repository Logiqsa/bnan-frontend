import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Award, Calendar, FileText, GraduationCap, LogOut, Menu, MessageSquare, Star, Users, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import logo from "@/assets/logo-bnan.png";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const roleNavItems: Record<string, NavItem[]> = {
  admin: [
    { label: "طلبات المعلمين", icon: GraduationCap, path: "/admin?tab=teacher-applications" },
    { label: "آراء العملاء", icon: Star, path: "/admin?tab=testimonials" },
    { label: "تقييمات العملاء", icon: MessageSquare, path: "/admin?tab=testimonial-ratings" },
    { label: "قصص النجاح", icon: Award, path: "/admin?tab=success-stories" },
    { label: "حسابات زوم", icon: Video, path: "/admin?tab=zoom-accounts" },
    { label: "ربط الصفوف بـ Zoom", icon: Users, path: "/admin?tab=zoom-grades" },
    { label: "الصفحات القانونية", icon: FileText, path: "/admin?tab=legal-pages" },
  ],
  teacher: [
    { label: "جدول الحصص", icon: Calendar, path: "/portal/teacher/schedule" },
  ],
  student: [
    { label: "جدول الحصص", icon: Calendar, path: "/portal/student/schedule" },
  ],
};

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  teacher: "معلم",
  student: "طالب",
};

const isItemActive = (itemPath: string, pathname: string, search: string) =>
  itemPath.includes("?") ? itemPath === `${pathname}${search}` : itemPath === pathname;

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role || "student";
  const items = roleNavItems[role] || [];

  return (
    <div className="h-full min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="h-20 w-auto object-contain brightness-0 invert" />
        </Link>
        <p className="text-xs text-sidebar-foreground/60 mt-2">{roleLabels[role] || role}</p>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <p className="font-cairo font-semibold text-sm truncate">{user?.fullName}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = isItemActive(item.path, location.pathname, location.search);
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-cairo transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-right">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

const DashboardSidebar = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>
    );
  }

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-40 h-14 bg-sidebar flex items-center justify-between px-4 border-b border-sidebar-border">
        <button onClick={() => setOpen(true)} className="text-sidebar-foreground" aria-label="فتح القائمة">
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="h-10 w-auto object-contain brightness-0 invert" />
        </Link>
        <div className="w-6" />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DashboardSidebar;
