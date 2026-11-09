import type { PortalUser } from "@/api/types";

export const ADMIN_PERMISSION_GROUPS = [
  { key: "overview", ar: "نظرة عامة", en: "Overview", permissions: [{ key: "dashboard", ar: "لوحة التحكم والإحصائيات", en: "Dashboard and statistics" }] },
  { key: "communication", ar: "التواصل", en: "Communication", permissions: [{ key: "messages", ar: "الرسائل", en: "Messages" }] },
  { key: "requests", ar: "الطلبات", en: "Requests", permissions: [
    { key: "teacher_applications", ar: "طلبات المعلمين", en: "Teacher applications" },
    { key: "classroom_change_requests", ar: "طلبات تغيير المعلم", en: "Classroom change requests" },
    { key: "teacher_assignments", ar: "تعيين المعلمين للفصول", en: "Teacher classroom assignments" },
    { key: "subject_requests", ar: "طلبات المواد", en: "Subject requests" },
  ] },
  { key: "users", ar: "المستخدمون", en: "Users", permissions: [
    { key: "students", ar: "الطلاب", en: "Students" },
    { key: "parents", ar: "أولياء الأمور", en: "Parents" },
    { key: "users", ar: "كل المستخدمين", en: "All users" },
    { key: "teachers", ar: "المعلمون", en: "Teachers" },
    { key: "supervisors", ar: "المشرفون", en: "Supervisors" },
    { key: "admins", ar: "إدارة الأدمن والصلاحيات", en: "Administrators and permissions" },
  ] },
  { key: "learning", ar: "التعليم", en: "Learning", permissions: [
    { key: "classrooms", ar: "الفصول", en: "Classrooms" },
    { key: "schedule", ar: "جدول الحصص", en: "Lesson schedule" },
    { key: "courses", ar: "الدورات والمجموعات", en: "Courses and groups" },
    { key: "catalog", ar: "المناهج والصفوف والمواد والباقات", en: "Curriculums, grades, subjects and packages" },
    { key: "assignments", ar: "الواجبات والتسليمات", en: "Assignments and submissions" },
    { key: "certificates", ar: "الشهادات", en: "Certificates" },
  ] },
  { key: "finance", ar: "المالية", en: "Finance", permissions: [
    { key: "subscriptions", ar: "الاشتراكات", en: "Subscriptions" },
    { key: "payments", ar: "المدفوعات", en: "Payments" },
    { key: "payroll", ar: "مستحقات ورواتب المعلمين", en: "Teacher payroll" },
    { key: "teacher_attendance", ar: "تأخير وغياب وخصومات المعلمين", en: "Teacher attendance and deductions" },
  ] },
  { key: "live", ar: "الفصول المباشرة", en: "Live classrooms", permissions: [
    { key: "zoom", ar: "حسابات وإعدادات زوم", en: "Zoom accounts and settings" },
    { key: "recordings", ar: "تسجيلات الحصص", en: "Lesson recordings" },
  ] },
  { key: "content", ar: "المحتوى والتواصل", en: "Content and communication", permissions: [
    { key: "notifications", ar: "إرسال وسجل الإشعارات", en: "Send and view notifications" },
    { key: "announcements", ar: "عروض الشريط العلوي", en: "Top banner offers" },
    { key: "content", ar: "قصص النجاح وآراء العملاء والتقييمات", en: "Success stories, testimonials and ratings" },
    { key: "legal_pages", ar: "الصفحات القانونية", en: "Legal pages" },
  ] },
  { key: "system", ar: "النظام", en: "System", permissions: [
    { key: "contact_settings", ar: "وسائل التواصل", en: "Contact settings" },
    { key: "home_statistics", ar: "إحصائيات الصفحة الرئيسية", en: "Home page statistics" },
    { key: "client_errors", ar: "أخطاء التطبيقات", en: "Application errors" },
  ] },
] as const;

export type AdminPermission = typeof ADMIN_PERMISSION_GROUPS[number]["permissions"][number]["key"];
export const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.key)) as AdminPermission[];

export const hasAdminPermission = (user: Pick<PortalUser, "role" | "adminAccess" | "adminPermissions"> | null | undefined, permission?: AdminPermission | null) => {
  if (!user || user.role !== "admin") return false;
  if (!permission || !user.adminAccess || user.adminAccess === "full") return true;
  return user.adminPermissions?.includes(permission) ?? false;
};

export const permissionForAdminLocation = (pathname: string, search = ""): AdminPermission | null => {
  if (pathname === "/admin/settings") return null;
  if (pathname.startsWith("/admin/messages")) return "messages";
  if (pathname.startsWith("/admin/payroll")) return "payroll";
  if (pathname.startsWith("/admin/teacher-attendance")) return "teacher_attendance";
  if (pathname.startsWith("/admin/subscriptions")) return "subscriptions";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/certificates")) return "certificates";
  if (pathname.startsWith("/admin/assignments")) return "assignments";
  if (pathname.startsWith("/admin/subject-requests") || pathname.startsWith("/admin/gulf-subject-requests")) return "subject_requests";
  if (pathname.startsWith("/admin/students")) return "students";
  if (pathname.startsWith("/admin/parents")) return "parents";
  if (pathname.startsWith("/admin/client-errors")) return "client_errors";
  if (pathname.startsWith("/admin/contact-settings")) return "contact_settings";
  if (pathname.startsWith("/admin/classroom-change-requests")) return "classroom_change_requests";
  if (pathname.startsWith("/admin/teacher-assignment")) return "teacher_assignments";
  if (pathname.startsWith("/admin/classroom-recordings") || pathname.startsWith("/admin/missing-recordings") || pathname.startsWith("/admin/classroom-sessions")) return "recordings";
  if (pathname.startsWith("/admin/schedule")) return "schedule";
  if (pathname.startsWith("/admin/classroom-zoom") || pathname.startsWith("/admin/zoom-availability") || pathname.startsWith("/admin/zoom-accounts")) return "zoom";
  if (pathname.startsWith("/admin/home-statistics")) return "home_statistics";
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  if (pathname.startsWith("/admin/announcements")) return "announcements";
  if (pathname.startsWith("/admin/classrooms") || pathname.startsWith("/admin/classroom-management") || pathname.startsWith("/admin/course-classrooms")) return "classrooms";
  if (pathname.startsWith("/admin/courses")) return "courses";
  if (pathname.startsWith("/admin/catalog")) return "catalog";
  if (pathname.startsWith("/admin/teachers")) return "teachers";
  if (pathname !== "/admin") return "dashboard";

  const tab = new URLSearchParams(search).get("tab") || "overview";
  if (tab === "all-users") return "users";
  if (tab === "supervisors") return "supervisors";
  if (tab === "admins") return "admins";
  if (tab === "teacher-applications") return "teacher_applications";
  if (tab === "zoom-accounts" || tab === "zoom-grades") return "zoom";
  if (tab === "legal-pages") return "legal_pages";
  if (["success-stories", "testimonial-images", "testimonial-ratings", "testimonials"].includes(tab)) return "content";
  return "dashboard";
};

export const ADMIN_PERMISSION_HOME: Array<{ permission: AdminPermission; path: string }> = [
  { permission: "dashboard", path: "/admin" },
  { permission: "messages", path: "/admin/messages" },
  { permission: "teacher_applications", path: "/admin?tab=teacher-applications" },
  { permission: "classroom_change_requests", path: "/admin/classroom-change-requests" },
  { permission: "teacher_assignments", path: "/admin/teacher-assignment" },
  { permission: "subject_requests", path: "/admin/subject-requests" },
  { permission: "students", path: "/admin/students" },
  { permission: "parents", path: "/admin/parents" },
  { permission: "users", path: "/admin?tab=all-users" },
  { permission: "teachers", path: "/admin/teachers" },
  { permission: "supervisors", path: "/admin?tab=supervisors" },
  { permission: "admins", path: "/admin?tab=admins" },
  { permission: "classrooms", path: "/admin/classrooms" },
  { permission: "schedule", path: "/admin/schedule" },
  { permission: "courses", path: "/admin/courses" },
  { permission: "catalog", path: "/admin/catalog/curriculums" },
  { permission: "subscriptions", path: "/admin/subscriptions" },
  { permission: "payments", path: "/admin/payments" },
  { permission: "payroll", path: "/admin/payroll" },
  { permission: "teacher_attendance", path: "/admin/teacher-attendance" },
  { permission: "zoom", path: "/admin?tab=zoom-accounts" },
  { permission: "recordings", path: "/admin/classroom-recordings" },
  { permission: "notifications", path: "/admin/notifications" },
  { permission: "announcements", path: "/admin/announcements" },
  { permission: "content", path: "/admin?tab=success-stories" },
  { permission: "legal_pages", path: "/admin?tab=legal-pages" },
  { permission: "contact_settings", path: "/admin/contact-settings" },
  { permission: "home_statistics", path: "/admin/home-statistics" },
  { permission: "client_errors", path: "/admin/client-errors" },
];

export const firstAllowedAdminPath = (user: PortalUser) => ADMIN_PERMISSION_HOME.find((item) => hasAdminPermission(user, item.permission))?.path || "/admin/settings";
