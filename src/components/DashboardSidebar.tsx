import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Award, Bell, Calendar, ChevronLeft, ChevronsUpDown, FileText, GraduationCap, LayoutDashboard, Loader2, LogOut, Menu, MessageSquare, School, Settings, ShieldCheck, Star, Trash2, Upload, UserPlus, UserRound, Users, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

// Exported so role-scoped navigation can be verified without rendering auth state.
// eslint-disable-next-line react-refresh/only-export-components
export const roleNavItems: Record<string, NavItem[]> = {
  admin: [
    { label: "الرئيسية", labelEn: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "طلبات المعلمين", labelEn: "Teacher applications", icon: GraduationCap, path: "/admin?tab=teacher-applications" },
    { label: "المستخدمون", labelEn: "Users", icon: UserRound, path: "/admin?tab=users" },
    { label: "المشرفون", labelEn: "Supervisors", icon: ShieldCheck, path: "/admin?tab=supervisors" },
    { label: "إرسال إشعار", labelEn: "Send notification", icon: Bell, path: "/admin/notifications" },
    { label: "آراء العملاء", labelEn: "Testimonials", icon: Star, path: "/admin?tab=testimonials" },
    { label: "تقييمات العملاء", labelEn: "Customer ratings", icon: MessageSquare, path: "/admin?tab=testimonial-ratings" },
    { label: "قصص النجاح", labelEn: "Success stories", icon: Award, path: "/admin?tab=success-stories" },
    { label: "حسابات زوم", labelEn: "Zoom accounts", icon: Video, path: "/admin?tab=zoom-accounts" },
    { label: "ربط الصفوف بـ Zoom", labelEn: "Assign classes to Zoom", icon: Users, path: "/admin?tab=zoom-grades" },
    { label: "إدارة الفصول والمواعيد", labelEn: "Classrooms and availability", icon: School, path: "/admin/classrooms" },
    { label: "Zoom للفصول اليدوية", labelEn: "Manual classroom Zoom", icon: Video, path: "/admin/classroom-zoom" },
    { label: "رفع تسجيل حصة", labelEn: "Upload lesson recording", icon: Upload, path: "/admin/classroom-recordings" },
    { label: "تسجيلات الفصل", labelEn: "Class recordings", icon: Calendar, path: "/admin/classroom-sessions" },
    { label: "الصفحات القانونية", labelEn: "Legal pages", icon: FileText, path: "/admin?tab=legal-pages" },
    { label: "إعدادات الحساب", labelEn: "Account settings", icon: Settings, path: "/admin/settings" },
  ],
  teacher: [
    { label: "جدول الحصص", labelEn: "Lesson schedule", icon: Calendar, path: "/portal/teacher/schedule" },
    { label: "إعدادات الحساب", labelEn: "Account settings", icon: Settings, path: "/portal/teacher/settings" },
  ],
  student: [
    { label: "جدول الحصص", labelEn: "Lesson schedule", icon: Calendar, path: "/portal/student/schedule" },
    { label: "تسجيلات الحصص", labelEn: "Lesson recordings", icon: Video, path: "/portal/student/sessions" },
    { label: "إعدادات الحساب", labelEn: "Account settings", icon: Settings, path: "/portal/student/settings" },
  ],
  supervisor: [
    { label: "جدول الحصص", labelEn: "Lesson schedule", icon: Calendar, path: "/portal/supervisor/schedule" },
    { label: "الفصول والمواعيد", labelEn: "Classrooms and availability", icon: School, path: "/portal/supervisor/classrooms" },
    { label: "Zoom للفصول اليدوية", labelEn: "Manual classroom Zoom", icon: Video, path: "/portal/supervisor/classrooms/zoom" },
    { label: "إعدادات الحساب", labelEn: "Account settings", icon: Settings, path: "/portal/supervisor/settings" },
  ],
};

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  teacher: "معلم",
  student: "طالب",
  supervisor: "مشرف",
};

const isItemActive = (itemPath: string, pathname: string, search: string) =>
  itemPath.includes("?") ? itemPath === `${pathname}${search}` : itemPath === pathname && (!search || pathname !== "/admin");

const SidebarContent = ({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) => {
  const { user, rememberedAccounts, switchAccount, prepareAddAccount, forgetRememberedAccount, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role || "student";
  const items = roleNavItems[role] || [];
  const { isArabic, pick } = useLanguage();
  const homeFor = (accountRole: string) => accountRole === "admin" ? "/admin" : `/portal/${accountRole}/schedule`;
  const switchableAccounts = rememberedAccounts.filter((account) => account.user.id !== user?.id);
  const [switchingName, setSwitchingName] = useState("");
  const chooseAccount = (account: typeof switchableAccounts[number]) => {
    setSwitchingName(account.user.fullName);
    window.setTimeout(() => {
      switchAccount(account.user.id);
      navigate(homeFor(account.user.role));
      onNavigate?.();
      setSwitchingName("");
    }, 700);
  };

  return (
    <div className="h-full min-h-0 bg-sidebar text-sidebar-foreground flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <div className={`border-b border-sidebar-border transition-all duration-300 ${collapsed ? "p-2" : "p-4"}`}>
        <div className="flex items-center gap-1">
          <Link to="/" aria-label="العودة إلى الصفحة الرئيسية" className={`flex justify-center overflow-hidden transition-[width] duration-300 ${collapsed ? "min-w-0 flex-1" : "w-4/5"}`}>
            <img src={logo} alt="أكاديمية بنان" className={`max-w-full object-contain brightness-0 invert transition-all duration-300 ${collapsed ? "h-10" : "h-20"}`} />
          </Link>
          {onToggle && <button
            type="button"
            onClick={onToggle}
            className={`grid h-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-sidebar-foreground transition-all duration-300 hover:bg-sidebar-accent ${collapsed ? "w-9 min-w-9" : "w-1/5 min-w-0"}`}
            aria-label={collapsed ? pick("فتح القائمة الجانبية", "Expand sidebar") : pick("طي القائمة الجانبية", "Collapse sidebar")}
            title={collapsed ? pick("فتح القائمة", "Expand") : pick("طي القائمة", "Collapse")}
          >
            <ChevronLeft className={`h-4 w-4 shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          </button>}
        </div>
        {!collapsed && <div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-sidebar-foreground/60">{pick(roleLabels[role] || role, role === "admin" ? "Administrator" : role === "teacher" ? "Teacher" : role === "supervisor" ? "Supervisor" : "Student")}</p><LanguageToggle className="bg-white/10 text-sidebar-foreground hover:bg-white/20" /></div>}
      </div>

      <div className={`border-b border-sidebar-border transition-all duration-300 ${collapsed ? "h-0 overflow-hidden border-b-0 p-0 opacity-0" : "p-4 opacity-100"}`}>
        {switchableAccounts.length > 0 ? <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg p-2 text-start transition-colors hover:bg-sidebar-accent/50" aria-label={pick("تبديل الحساب", "Switch account")} title={pick("تبديل الحساب", "Switch account")}><span className="min-w-0 flex-1 truncate font-cairo text-sm font-semibold">{user?.fullName}</span><ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/70"/></button></DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-64">
              <DropdownMenuLabel>{pick("الحسابات المحفوظة", "Saved accounts")}</DropdownMenuLabel>
              {switchableAccounts.map((account) => <DropdownMenuItem key={account.user.id} className="cursor-pointer gap-3 py-2" onClick={() => chooseAccount(account)}><UserRound className="h-4 w-4 shrink-0"/><span className="min-w-0 flex-1"><span className="block truncate font-medium">{account.user.fullName}</span><span className="block truncate text-xs text-muted-foreground" dir="ltr">{account.user.email}</span></span><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); forgetRememberedAccount(account.user.id); }} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-red-700 hover:bg-red-50 hover:text-red-800" aria-label={pick(`حذف حساب ${account.user.fullName}`, `Remove ${account.user.fullName}`)} title={pick("حذف الحساب المحفوظ", "Remove saved account")}><Trash2 className="h-4 w-4"/></button></DropdownMenuItem>)}
              <DropdownMenuItem className="cursor-pointer gap-3 border-t py-2" onClick={() => { prepareAddAccount(); navigate("/portal/login?addAccount=1"); onNavigate?.(); }}><UserPlus className="h-4 w-4"/>{pick("إضافة حساب", "Add account")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> : <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg p-2 text-start transition-colors hover:bg-sidebar-accent/50" onClick={() => { prepareAddAccount(); navigate("/portal/login?addAccount=1"); onNavigate?.(); }} aria-label={pick("إضافة حساب", "Add account")} title={pick("إضافة حساب", "Add account")}><span className="min-w-0 flex-1 truncate font-cairo text-sm font-semibold">{user?.fullName}</span><UserPlus className="h-4 w-4 shrink-0 text-sidebar-foreground/70"/></button>}
      </div>

      <nav className={`flex-1 space-y-1 overflow-x-hidden overflow-y-auto transition-all duration-300 ${collapsed ? "p-2" : "p-3"}`}>
        {items.map((item) => {
          const active = isItemActive(item.path, location.pathname, location.search);
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              title={collapsed ? pick(item.label, item.labelEn) : undefined}
              aria-label={pick(item.label, item.labelEn)}
              className={`w-full flex items-center rounded-lg text-sm font-cairo transition-all duration-300 ${collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"} ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className={`flex-1 whitespace-nowrap ${isArabic?"text-right":"text-left"}`}>{pick(item.label,item.labelEn)}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-sidebar-border transition-all duration-300 ${collapsed ? "p-2" : "p-3"}`}>
        <Button
          variant="ghost"
          onClick={logout}
          title={collapsed ? pick("تسجيل الخروج", "Log out") : undefined}
          aria-label={pick("تسجيل الخروج", "Log out")}
          className={`w-full text-sidebar-foreground/70 hover:text-destructive hover:bg-sidebar-accent/50 ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && pick("تسجيل الخروج", "Log out")}
        </Button>
      </div>
      {switchingName && <div className="fixed inset-0 z-[100] grid place-items-center bg-white/95 backdrop-blur-sm" role="status" aria-live="polite"><div className="animate-in fade-in zoom-in-95 rounded-2xl border border-[hsl(221_63%_15%/0.12)] bg-white px-10 py-9 text-center shadow-2xl duration-300"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[hsl(221_63%_15%/0.08)] ring-1 ring-[hsl(221_63%_15%/0.12)]"><Loader2 className="h-10 w-10 animate-spin text-[hsl(221_63%_15%)]"/></span><h2 className="mt-5 text-xl font-bold text-[hsl(221_63%_15%)]">{pick("جاري تبديل الحساب", "Switching account")}</h2><p className="mt-2 text-sm font-medium text-[hsl(221_63%_15%/0.7)]">{switchingName}</p></div></div>}
    </div>
  );
};

const DashboardSidebar = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("bnan_sidebar_collapsed") === "1");
  const { logout } = usePortalAuth();
  const { pick } = useLanguage();

  if (!isMobile) {
    return (
      <aside className={`relative flex min-h-screen shrink-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out ${collapsed ? "w-20" : "w-64"}`}>
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => {
            const next = !current;
            localStorage.setItem("bnan_sidebar_collapsed", next ? "1" : "0");
            return next;
          })}
        />
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
