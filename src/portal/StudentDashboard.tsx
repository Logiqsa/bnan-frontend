import { useQuery } from "@tanstack/react-query";
import { Award, BarChart3, BookOpen, GraduationCap, RefreshCw, UserCheck } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { studentHomeApi, studentHomeQueryKey, type StudentHomeSubscriptionSummary } from "@/api/studentHomeApi";
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
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
  if (query.isLoading) return <StudentDashboardSkeleton />;
  if (query.isError || !query.data) return <DashboardLayout><div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center"><Card className="w-full"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><p className="font-semibold text-destructive">تعذر تحميل بيانات لوحة الطالب</p><Button onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />إعادة المحاولة</Button></CardContent></Card></div></DashboardLayout>;

  const { student, stats, weeklyEvaluation } = query.data;
  const subscriptions = query.data.subscriptions?.length ? query.data.subscriptions : query.data.subscription ? [query.data.subscription] : [];
  const attendance = stats?.attendance;
  const interaction = stats?.interaction;
  const hasWeeklyEvaluation = Boolean(weeklyEvaluation && (weeklyEvaluation.evaluationsCount ?? 0) > 0);
  const curriculumGrade = [student.curriculum?.name, student.grade?.name].filter(Boolean).join(" • ");

  return <DashboardLayout><div className="mx-auto w-full max-w-7xl space-y-3">
    <header className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span><div className="min-w-0"><h1 className="break-words text-xl font-bold sm:text-2xl">{pick(`أهلاً${student.fullName ? `، ${student.fullName}` : ""} 👋`, `Welcome${student.fullName ? `, ${student.fullName}` : ""} 👋`)}</h1>{curriculumGrade && <p className="mt-1 break-words text-sm text-muted-foreground">{curriculumGrade}</p>}</div></div><Button asChild size="sm" variant="outline" className="w-full sm:w-auto"><Link to="/portal/student/subjects">{pick("عرض موادي", "View my subjects")}</Link></Button></div></header>
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <Card className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" />ملخص الاشتراك</CardTitle><Button asChild size="sm" variant="ghost"><Link to="/portal/student/subscriptions">عرض التفاصيل</Link></Button></CardHeader><CardContent className="space-y-3 px-4 pb-4">{subscriptions.length ? <>{subscriptions.length > 1 && <p className="text-sm text-muted-foreground">تظهر الاشتراكات بالترتيب الوارد من النظام، وأولها هو أحدث اشتراك.</p>}{subscriptions.map((item, index) => item.summary ? <SubscriptionCard key={item.id || index} summary={item.summary} latest={index === 0} /> : null)}</> : <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">لا يوجد اشتراك حالي</p>}</CardContent></Card>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Card className="min-w-0 shadow-sm"><CardHeader className="p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5 text-primary" />الحضور</CardTitle></CardHeader><CardContent className="px-4 pb-4">{attendance ? <div className="space-y-3"><div className="rounded-xl bg-primary/5 p-3 text-center"><p className="text-xs text-muted-foreground">نسبة الحضور</p><p className="mt-0.5 text-2xl font-bold text-primary">{typeof attendance.percentage === "number" ? `${number(attendance.percentage)}%` : "غير متاحة حاليًا"}</p></div><div className="grid grid-cols-2 gap-2"><Metric label="الإجمالي" value={attendance.total} /><Metric label="حاضر" value={attendance.present} /><Metric label="متأخر" value={attendance.late} /><Metric label="غائب" value={attendance.absent} /></div></div> : <p className="text-sm text-muted-foreground">بيانات الحضور غير متاحة حاليًا</p>}</CardContent></Card>
        <Card className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" />التقييم الأسبوعي</CardTitle><Button asChild size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs"><Link to="/portal/student/evaluations">عرض سجل التقييمات</Link></Button></CardHeader><CardContent className="px-4 pb-4">{hasWeeklyEvaluation ? <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><Metric label="الحضور" value={weeklyEvaluation?.attendancePercentage} /><Metric label="المشاركة" value={weeklyEvaluation?.participationPercentage} /><Metric label="الواجب" value={weeklyEvaluation?.homeworkPercentage} /><Metric label="السلوك" value={weeklyEvaluation?.behaviorPercentage} /></div>{typeof weeklyEvaluation?.bonusPoints === "number" && <p className="text-xs">نقاط إضافية: <strong>{number(weeklyEvaluation.bonusPoints)}</strong></p>}{weeklyEvaluation?.teacherNote && <p className="break-words rounded-xl bg-muted/50 p-2 text-xs">{weeklyEvaluation.teacherNote}</p>}</div> : <p className="text-sm text-muted-foreground">لا يوجد تقييم أسبوعي متاح حاليًا</p>}</CardContent></Card>
        <Card className="min-w-0 shadow-sm"><CardHeader className="p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5 text-primary" />التفاعل</CardTitle></CardHeader><CardContent className="px-4 pb-4">{interaction && (typeof interaction.score === "number" || typeof interaction.evaluationsCount === "number") ? <div className="grid grid-cols-2 gap-2"><Metric label="التقييم" value={interaction.score} /><Metric label="الحد الأقصى" value={interaction.maxScore} /><Metric label="عدد التقييمات" value={interaction.evaluationsCount} /></div> : <p className="text-sm text-muted-foreground">بيانات التفاعل غير متاحة حاليًا</p>}</CardContent></Card>
        <Card className="min-w-0 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-primary" />الشهادات</CardTitle><Button asChild size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs"><Link to="/portal/student/certificates">عرض الكل</Link></Button></CardHeader><CardContent className="px-4 pb-4">{typeof stats?.certificates?.count === "number" ? <p className="text-3xl font-bold tabular-nums text-primary">{number(stats.certificates.count)}</p> : <p className="text-sm text-muted-foreground">بيانات الشهادات غير متاحة حاليًا</p>}</CardContent></Card>
      </div>
    </div>
  </div></DashboardLayout>;
}
