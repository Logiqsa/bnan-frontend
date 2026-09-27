import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpen, ClipboardList, GraduationCap, RefreshCw, UserCheck } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { studentHomeApi, studentHomeQueryKey, type StudentHomeSubscriptionSummary } from "@/api/studentHomeApi";
import { studentAssignmentsApi, studentAssignmentsQueryKey } from "@/api/studentAssignmentsApi";
import { notificationsApi } from "@/api/notificationsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

const number = (value: number) => new Intl.NumberFormat().format(value);

const StudentDashboardSkeleton = () => (
  <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-3" aria-label="جاري تحميل لوحة الطالب">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-[430px] rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  </DashboardLayout>
);

const Metric = ({ label, value }: { label: string; value?: number | null }) => (
  <div className="min-w-0 rounded-xl bg-muted/50 p-2.5 text-center">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-base font-bold tabular-nums">{typeof value === "number" ? number(value) : "—"}</p>
  </div>
);

const SubscriptionCard = ({ summary, latest }: { summary: StudentHomeSubscriptionSummary; latest: boolean }) => {
  const statusLabels: Record<string, string> = {
    active: "نشط", grace_period: "فترة سماح", suspended: "موقوف", expired: "منتهي", cancelled: "ملغي",
  };
  const typeLabels: Record<string, string> = { hours: "باقة ساعات", monthly: "اشتراك شهري" };
  const scopeLabels: Record<string, string> = { all_subjects: "كل المواد", single_subject: "مادة واحدة" };
  return (
    <div className="rounded-xl border p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-bold">{summary.packageName || "اشتراك"}</p>
          {summary.subject?.name && <p className="mt-1 break-words text-sm text-muted-foreground">{summary.subject.name}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {latest && <Badge variant="outline">الأحدث</Badge>}
          {summary.computedStatus && <Badge variant={summary.isActive ? "default" : "secondary"}>{statusLabels[summary.computedStatus] || summary.computedStatus}</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {summary.packageType && <span>{typeLabels[summary.packageType] || summary.packageType}</span>}
        {summary.accessScope && <span>• {scopeLabels[summary.accessScope] || summary.accessScope}</span>}
      </div>
      {typeof summary.progressPercentage === "number" && <div className="mt-3"><div className="mb-1.5 flex justify-between text-xs"><span>التقدم</span><span>{number(summary.progressPercentage)}%</span></div><Progress value={summary.progressPercentage} /></div>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {typeof summary.totalHours === "number" && <Metric label="إجمالي الساعات" value={summary.totalHours} />}
        {typeof summary.usedHours === "number" && <Metric label="المستخدمة" value={summary.usedHours} />}
        {typeof summary.remainingHours === "number" && <Metric label="المتبقية" value={summary.remainingHours} />}
        {typeof summary.purchasedMonths === "number" && <Metric label="الأشهر المشتراة" value={summary.purchasedMonths} />}
      </div>
      {(summary.hasPendingRenewal || summary.canRenew) && <div className="mt-3 flex flex-wrap gap-2">{summary.hasPendingRenewal && <Badge variant="secondary">يوجد طلب تجديد معلق</Badge>}{summary.canRenew && !summary.hasPendingRenewal && <Badge variant="outline">متاح للتجديد</Badge>}</div>}
    </div>
  );
};

export default function StudentDashboard() {
  const { pick } = useLanguage();
  const query = useQuery({ queryKey: studentHomeQueryKey, queryFn: studentHomeApi.get, staleTime: 60_000, retry: 1, refetchOnMount: "always" });
  const assignmentsQuery = useQuery({ queryKey: studentAssignmentsQueryKey, queryFn: studentAssignmentsApi.list, staleTime: 30_000, retry: 1 });
  const notificationsQuery = useQuery({ queryKey: ["student-dashboard-notifications"], queryFn: () => notificationsApi.list(5), staleTime: 30_000, retry: 1 });
  if (query.isLoading) return <StudentDashboardSkeleton />;
  if (query.isError || !query.data) return <DashboardLayout><div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center"><Card className="w-full"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><p className="font-semibold text-destructive">تعذر تحميل بيانات لوحة الطالب</p><Button onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />إعادة المحاولة</Button></CardContent></Card></div></DashboardLayout>;

  const { student, stats } = query.data;
  const subscriptions = query.data.subscriptions?.length ? query.data.subscriptions : query.data.subscription ? [query.data.subscription] : [];
  const attendance = stats?.attendance;
  const curriculumGrade = [student.curriculum?.name, student.grade?.name].filter(Boolean).join(" • ");
  const pendingAssignments = (assignmentsQuery.data || []).filter((assignment) => !assignment.submitted);
  const recentNotifications = notificationsQuery.data?.data.slice(0, 2) || [];

  return <DashboardLayout><div className="mx-auto w-full max-w-7xl space-y-3">
    <header className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span><div className="min-w-0"><h1 className="break-words text-xl font-bold sm:text-2xl">{pick(`أهلاً${student.fullName ? `، ${student.fullName}` : ""} 👋`, `Welcome${student.fullName ? `, ${student.fullName}` : ""} 👋`)}</h1>{curriculumGrade && <p className="mt-1 break-words text-sm text-muted-foreground">{curriculumGrade}</p>}</div></div><Button asChild size="sm" variant="outline" className="w-full sm:w-auto"><Link to="/portal/student/subjects">{pick("عرض موادي", "View my subjects")}</Link></Button></div></header>
    <div className="grid items-start gap-3 lg:grid-cols-3">
      <Card className="min-w-0 shadow-sm lg:col-span-2"><CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" />ملخص الاشتراك</CardTitle><Button asChild size="sm" variant="ghost"><Link to="/portal/student/subscriptions">عرض التفاصيل</Link></Button></CardHeader><CardContent className="space-y-3 px-4 pb-4">{subscriptions.length ? <>{subscriptions.length > 1 && <p className="text-sm text-muted-foreground">تظهر الاشتراكات بالترتيب الوارد من النظام، وأولها هو أحدث اشتراك.</p>}{subscriptions.map((item, index) => item.summary ? <SubscriptionCard key={item.id || index} summary={item.summary} latest={index === 0} /> : null)}</> : <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">لا يوجد اشتراك حالي</p>}</CardContent></Card>
      <div className="min-w-0">
        <Card className="min-w-0 shadow-sm"><CardHeader className="p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5 text-primary" />الحضور</CardTitle></CardHeader><CardContent className="px-4 pb-4">{attendance ? <div className="space-y-3"><div className="rounded-xl bg-primary/5 p-3 text-center"><p className="text-xs text-muted-foreground">نسبة الحضور</p><p className="mt-0.5 text-2xl font-bold text-primary">{typeof attendance.percentage === "number" ? `${number(attendance.percentage)}%` : "غير متاحة حاليًا"}</p></div><div className="grid grid-cols-2 gap-2"><Metric label="الإجمالي" value={attendance.total} /><Metric label="حاضر" value={attendance.present} /><Metric label="متأخر" value={attendance.late} /><Metric label="غائب" value={attendance.absent} /></div></div> : <p className="text-sm text-muted-foreground">بيانات الحضور غير متاحة حاليًا</p>}</CardContent></Card>
      </div>
    </div>
    <section className="grid items-start gap-3 md:grid-cols-2" aria-label={pick("ملخص الواجبات والإشعارات", "Assignments and notifications summary")}>
      <Card className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" />{pick("الواجبات", "Assignments")}</CardTitle><Button asChild size="sm" variant="ghost"><Link to="/portal/student/assignments">{pick("عرض الكل", "View all")}</Link></Button></CardHeader><CardContent className="space-y-3 px-4 pb-4">{assignmentsQuery.isLoading ? <div className="space-y-2" aria-label={pick("جاري تحميل الواجبات", "Loading assignments")}><Skeleton className="h-7 w-20" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        : assignmentsQuery.isError ? <div className="space-y-3"><p className="text-sm text-destructive">{pick("تعذر تحميل الواجبات", "Unable to load assignments")}</p><Button size="sm" variant="outline" onClick={() => void assignmentsQuery.refetch()} disabled={assignmentsQuery.isFetching}><RefreshCw className={`h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></div>
          : pendingAssignments.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{pick("لا توجد واجبات بانتظار التسليم حاليًا", "No assignments are waiting for submission")}</p>
            : <><p className="text-sm text-muted-foreground">{pick(`لديك ${pendingAssignments.length} واجب بانتظار التسليم.`, `You have ${pendingAssignments.length} assignment(s) waiting for submission.`)}</p><div className="space-y-2">{pendingAssignments.slice(0, 2).map((assignment) => <Link key={assignment.id} to={`/portal/student/assignments?assignmentId=${encodeURIComponent(assignment.id)}`} className="block rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-muted/40"><p className="break-words font-semibold">{assignment.title}</p>{assignment.subject?.name && <p className="mt-1 text-xs text-muted-foreground">{assignment.subject.name}</p>}</Link>)}</div></>}</CardContent></Card>
      <Card className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" />{pick("الإشعارات", "Notifications")}</CardTitle><Button asChild size="sm" variant="ghost"><Link to="/portal/student/notifications">{pick("عرض الكل", "View all")}</Link></Button></CardHeader><CardContent className="space-y-3 px-4 pb-4">{notificationsQuery.isLoading ? <div className="space-y-2" aria-label={pick("جاري تحميل الإشعارات", "Loading notifications")}><Skeleton className="h-7 w-16" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        : notificationsQuery.isError ? <div className="space-y-3"><p className="text-sm text-destructive">{pick("تعذر تحميل الإشعارات", "Unable to load notifications")}</p><Button size="sm" variant="outline" onClick={() => void notificationsQuery.refetch()} disabled={notificationsQuery.isFetching}><RefreshCw className={`h-4 w-4 ${notificationsQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></div>
          : recentNotifications.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{pick("لا توجد إشعارات حتى الآن", "No notifications yet")}</p>
            : <><p className="text-sm text-muted-foreground">{notificationsQuery.data.unreadCount > 0 ? pick(`${notificationsQuery.data.unreadCount} إشعار غير مقروء`, `${notificationsQuery.data.unreadCount} unread notifications`) : pick("كل الإشعارات مقروءة", "All notifications are read")}</p><div className="space-y-2">{recentNotifications.map((notification) => <Link key={notification.id} to="/portal/student/notifications" className={`block rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-muted/40 ${notification.isRead ? "" : "border-primary/30 bg-primary/[0.03]"}`}><p className="break-words font-semibold">{notification.title || pick("إشعار", "Notification")}</p>{notification.body && <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{notification.body}</p>}</Link>)}</div></>}</CardContent></Card>
    </section>
  </div></DashboardLayout>;
}
