import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Award, Calendar, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, ShieldCheck, Star, Upload, UserRound, Users, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import logo from "@/assets/logo-bnan.png";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";

interface NavItem {
  label: string;
  labelEn: string;
  icon: LucideIcon;
  path: string;
}

const roleNavItems: Record<string, NavItem[]> = {
  admin: [
    { label: "الرئيسية", labelEn: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "طلبات المعلمين", labelEn: "Teacher applications", icon: GraduationCap, path: "/admin?tab=teacher-applications" },
    { label: "المستخدمون", labelEn: "Users", icon: UserRound, path: "/admin?tab=users" },
    { label: "المشرفون", labelEn: "Supervisors", icon: ShieldCheck, path: "/admin?tab=supervisors" },
    { label: "آراء العملاء", labelEn: "Testimonials", icon: Star, path: "/admin?tab=testimonials" },
    { label: "تقييمات العملاء", labelEn: "Customer ratings", icon: MessageSquare, path: "/admin?tab=testimonial-ratings" },
    { label: "قصص النجاح", labelEn: "Success stories", icon: Award, path: "/admin?tab=success-stories" },
    { label: "حسابات زوم", labelEn: "Zoom accounts", icon: Video, path: "/admin?tab=zoom-accounts" },
    { label: "ربط الصفوف بـ Zoom", labelEn: "Assign classes to Zoom", icon: Users, path: "/admin?tab=zoom-grades" },
    { label: "رفع تسجيل حصة", labelEn: "Upload lesson recording", icon: Upload, path: "/admin/classroom-recordings" },
    { label: "سيشنات الفصل", labelEn: "Class sessions", icon: Calendar, path: "/admin/classroom-sessions" },
    { label: "الصفحات القانونية", labelEn: "Legal pages", icon: FileText, path: "/admin?tab=legal-pages" },
  ],
  teacher: [
    { label: "جدول الحصص", labelEn: "Lesson schedule", icon: Calendar, path: "/portal/teacher/schedule" },
  ],
  student: [
    { label: "جدول الحصص", labelEn: "Lesson schedule", icon: Calendar, path: "/portal/student/schedule" },
    { label: "تسجيلات الحصص", labelEn: "Lesson recordings", icon: Video, path: "/portal/student/sessions" },
  ],
};

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  teacher: "معلم",
  student: "طالب",
};

const isItemActive = (itemPath: string, pathname: string, search: string) =>
  itemPath.includes("?") ? itemPath === `${pathname}${search}` : itemPath === pathname && (!search || pathname !== "/admin");

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role || "student";
  const items = roleNavItems[role] || [];
  const { isArabic, pick } = useLanguage();

  return (
    <div className="h-full min-h-0 bg-sidebar text-sidebar-foreground flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="h-20 w-auto object-contain brightness-0 invert" />
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-sidebar-foreground/60">{pick(roleLabels[role] || role, role === "admin" ? "Administrator" : role === "teacher" ? "Teacher" : "Student")}</p><LanguageToggle className="bg-white/10 text-sidebar-foreground hover:bg-white/20" /></div>
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
              <span className={`flex-1 ${isArabic?"text-right":"text-left"}`}>{pick(item.label,item.labelEn)}</span>
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
          {pick("تسجيل الخروج", "Log out")}
        </Button>
      </div>
    </div>
  );
};

const DashboardSidebar = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { logout } = usePortalAuth();
  const { pick } = useLanguage();

  if (!isMobile) {
    return (
      <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>
    );
  }

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-40 h-14 bg-sidebar flex items-center justify-between px-3 border-b border-sidebar-border">
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent" aria-label={pick("فتح القائمة","Open menu")}>
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="h-10 w-auto object-contain brightness-0 invert" />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle className="h-9 bg-white/10 px-2 text-xs text-sidebar-foreground hover:bg-white/20" />
          <Button variant="ghost" size="sm" onClick={logout} className="h-10 gap-1.5 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive" aria-label={pick("تسجيل الخروج","Log out")}>
            <LogOut className="h-4 w-4" />
            <span className="hidden min-[390px]:inline text-xs">{pick("خروج","Log out")}</span>
          </Button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="h-dvh w-72 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DashboardSidebar;
