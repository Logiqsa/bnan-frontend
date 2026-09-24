import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  GraduationCap,
  RefreshCw,
  ReceiptText,
  Users,
} from "lucide-react";
import { adminDashboardApi, type AdminDashboardStatistics } from "@/api/adminDashboardApi";
import { adminClassroomChangeRequestsApi } from "@/api/adminClassroomChangeRequestsApi";
import { adminGulfSubjectRequestsApi } from "@/api/adminGulfSubjectRequestsApi";
import { adminSubjectRequestsApi } from "@/api/adminSubjectRequestsApi";
import { teacherApplicationsApi } from "@/api/teacherApplicationsApi";
import { ApiError } from "@/api/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import TestimonialImagesAdmin from "./TestimonialImagesAdmin";
import TestimonialRatingsAdmin from "./TestimonialRatingsAdmin";
import SuccessStoriesAdmin from "./SuccessStoriesAdmin";
import ZoomAccountsAdmin from "./zoom/ZoomAccountsAdmin";
import GradeZoomAssignmentAdmin from "./zoom/GradeZoomAssignmentAdmin";
import LegalPagesAdmin from "./LegalPagesAdmin";
import TeacherApplicationsAdmin from "./TeacherApplicationsAdmin";
import UsersAdmin from "./UsersAdmin";
import { useLanguage } from "@/i18n/LanguageContext";
import AdminsAdmin from "./AdminsAdmin";

const DEFAULT_TAB = "overview";

const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "تعذر تحميل هذه البيانات.";

function DashboardWidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><span>{message}</span><button type="button" className="shrink-0 underline" onClick={onRetry}>إعادة المحاولة</button></div>;
}

function KpiCard({ icon: Icon, label, value, href, hint }: { icon: typeof Users; label: string; value: number; href: string; hint?: string }) {
  return <Link to={href} className="group"><Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-secondary group-hover:shadow-sky"><CardContent className="flex items-start justify-between gap-3 p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold text-primary">{value.toLocaleString("ar-EG")}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span></CardContent></Card></Link>;
}

function ActionCard({ icon: Icon, title, description, href, query, count }: { icon: typeof ClipboardList; title: string; description: string; href: string; query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }; count?: number }) {
  return <Card className="h-full"><CardContent className="flex h-full flex-col gap-4 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon className="h-5 w-5" /></span></div>{query.isLoading ? <div className="h-8 w-20 animate-pulse rounded bg-muted" /> : query.isError ? <DashboardWidgetError message={errorMessage(query.error)} onRetry={() => void query.refetch()} /> : <div className="flex items-end justify-between gap-3"><p className="text-2xl font-bold text-primary">{count === undefined ? "—" : count.toLocaleString("ar-EG")}</p><Link to={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">مراجعة <ArrowLeft className="h-4 w-4" /></Link></div>}</CardContent></Card>;
}

function AdminOverview() {
  const statistics = useQuery({ queryKey: ["admin-dashboard-statistics"], queryFn: adminDashboardApi.statistics, retry: 1 });
  const teacherRequests = useQuery({ queryKey: ["admin-dashboard-pending-teacher-requests"], queryFn: () => teacherApplicationsApi.countByStatus("pending"), retry: 1 });
  const egyptianRequests = useQuery({ queryKey: ["admin-dashboard-pending-egyptian-subject-requests"], queryFn: () => adminSubjectRequestsApi.list({ status: "awaiting_admin_approval", page: 1, limit: 1 }), retry: 1 });
  const gulfRequests = useQuery({ queryKey: ["admin-dashboard-pending-gulf-subject-requests"], queryFn: () => adminGulfSubjectRequestsApi.list({ status: "awaiting_admin_approval", page: 1, limit: 1 }), retry: 1 });
  const classroomChanges = useQuery({ queryKey: ["admin-dashboard-pending-classroom-changes"], queryFn: () => adminClassroomChangeRequestsApi.list({ status: "pending", page: 1, limit: 1 }), retry: 1 });
  const stats = statistics.data as AdminDashboardStatistics | undefined;
  const statsError = statistics.isError ? <DashboardWidgetError message={errorMessage(statistics.error)} onRetry={() => void statistics.refetch()} /> : null;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">لوحة التحكم</h1><p className="mt-1 text-muted-foreground">نظرة عامة على أهم العمليات والإحصائيات</p></div><button type="button" aria-label="تحديث لوحة التحكم" className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent" onClick={() => { void statistics.refetch(); void teacherRequests.refetch(); void egyptianRequests.refetch(); void gulfRequests.refetch(); void classroomChanges.refetch(); }} disabled={statistics.isFetching || teacherRequests.isFetching || egyptianRequests.isFetching || gulfRequests.isFetching || classroomChanges.isFetching}><RefreshCw className={statistics.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />تحديث</button></div>
    {statsError}
    {statistics.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Card key={item}><CardContent className="h-32 animate-pulse p-5"><div className="h-full rounded bg-muted" /></CardContent></Card>)}</div> : stats && <section><div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">لمحة سريعة</h2></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.totalStudents !== undefined && <KpiCard icon={Users} label="إجمالي الطلاب" value={stats.totalStudents} href="/admin/students" />}{stats.totalTeachers !== undefined && <KpiCard icon={GraduationCap} label="المعلمون" value={stats.totalTeachers} href="/admin/teachers" />}{stats.activeSubscriptions !== undefined && <KpiCard icon={CreditCard} label="الاشتراكات النشطة" value={stats.activeSubscriptions} href="/admin/subscriptions" />}{stats.pendingReceipts !== undefined && <KpiCard icon={ReceiptText} label="إيصالات دفع معلقة" value={stats.pendingReceipts} href="/admin/payments" hint="تحتاج للمراجعة" />}{stats.todaySessions !== undefined && <KpiCard icon={CalendarDays} label="حصص اليوم" value={stats.todaySessions} href="/admin/classrooms" />}</div></section>}
    <section><div className="mb-3 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">يحتاج إلى انتباهك</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><ActionCard icon={GraduationCap} title="طلبات المعلمين" description="طلبات جديدة تنتظر المراجعة" href="/admin?tab=teacher-applications" query={teacherRequests} count={teacherRequests.data} /><ActionCard icon={ClipboardList} title="طلبات المواد المصرية" description="طلبات إضافة مواد تنتظر الاعتماد" href="/admin/subject-requests" query={egyptianRequests} count={egyptianRequests.data?.total} /><ActionCard icon={ClipboardList} title="طلبات المواد الخليجية" description="طلبات تحتاج متابعة إدارية" href="/admin/gulf-subject-requests" query={gulfRequests} count={gulfRequests.data?.pagination.total} /><ActionCard icon={Users} title="طلبات تغيير المعلم" description="طلبات تشغيلية قيد المراجعة" href="/admin/classroom-change-requests" query={classroomChanges} count={classroomChanges.data?.total ?? classroomChanges.data?.results} /></div></section>
    {stats && <section><div className="mb-3 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">الوضع المالي والتشغيلي</h2></div><div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">إيصالات مصرية معلقة</p><p className="mt-2 text-2xl font-bold">{stats.pendingReceipts?.toLocaleString("ar-EG") ?? "—"}</p><Link className="mt-3 inline-block text-sm text-primary hover:underline" to="/admin/payments">فتح المدفوعات</Link></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">الاشتراكات المنتهية</p><p className="mt-2 text-2xl font-bold">{stats.expiredSubscriptions?.toLocaleString("ar-EG") ?? "—"}</p><Link className="mt-3 inline-block text-sm text-primary hover:underline" to="/admin/subscriptions">فتح الاشتراكات</Link></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">حصص اليوم</p><p className="mt-2 text-2xl font-bold">{stats.todaySessions?.toLocaleString("ar-EG") ?? "—"}</p><Link className="mt-3 inline-block text-sm text-primary hover:underline" to="/admin/classrooms">إدارة الفصول</Link></CardContent></Card></div></section>}
  </div>;
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || DEFAULT_TAB;
  const { isArabic, pick } = useLanguage();

  const setTab = (value: string) => setSearchParams({ tab: value });

  return (
    <DashboardLayout>
      <Tabs value={tab} onValueChange={setTab} dir={isArabic ? "rtl" : "ltr"}>
        <TabsContent value="overview" className="mt-0">
          <AdminOverview />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-0">
          <TestimonialImagesAdmin />
        </TabsContent>
        <TabsContent value="testimonial-ratings" className="mt-0">
          <TestimonialRatingsAdmin />
        </TabsContent>
        <TabsContent value="success-stories" className="mt-0">
          <SuccessStoriesAdmin />
        </TabsContent>
        <TabsContent value="zoom-accounts" className="mt-0">
          <ZoomAccountsAdmin
            onGoToGradeAssignment={() => setTab("zoom-grades")}
          />
        </TabsContent>
        <TabsContent value="zoom-grades" className="mt-0">
          <GradeZoomAssignmentAdmin />
        </TabsContent>
        <TabsContent value="legal-pages" className="mt-0">
          <LegalPagesAdmin />
        </TabsContent>
        <TabsContent value="teacher-applications" className="mt-0">
          <TeacherApplicationsAdmin />
        </TabsContent>
        <TabsContent value="all-users" className="mt-0">
          <UsersAdmin
            title={pick("كل المستخدمين", "All users")}
            description={pick(
              "البحث والتصفية وإدارة جميع الحسابات المسجلة في النظام.",
              "Search, filter, and manage every account registered in the system.",
            )}
            roles={["student", "parent", "teacher", "supervisor", "admin"]}
            includeAllRoles
          />
        </TabsContent>
        <TabsContent value="supervisors" className="mt-0">
          <UsersAdmin
            title={pick("المشرفون", "Supervisors")}
            description={pick(
              "عرض حسابات المشرفين المسجلة في النظام.",
              "View supervisor accounts registered in the system.",
            )}
            roles={["supervisor"]}
          />
        </TabsContent>
        <TabsContent value="admins" className="mt-0">
          <AdminsAdmin />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
