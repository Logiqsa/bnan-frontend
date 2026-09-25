import { useInfiniteQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, RefreshCw } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  studentEvaluationKeys,
  studentEvaluationsApi,
  type StudentEvaluationAttendance,
  type StudentEvaluationRating,
  type StudentEvaluationValue,
  type StudentEvaluationsResponse,
} from "@/api/studentEvaluationsApi";
import { ApiError } from "@/api/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const attendanceLabels: Record<StudentEvaluationAttendance, string> = {
  present: "حاضر", absent: "غائب", late: "متأخر", excused: "معذور",
};
const ratingLabels: Record<StudentEvaluationRating, string> = {
  excellent: "ممتاز", very_good: "جيد جدًا", good: "جيد", acceptable: "مقبول", weak: "ضعيف", "-": "—",
};

const formattedDate = (value: string, locale: string, withTime = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
};

function EvaluationDetails({ evaluation }: { evaluation: StudentEvaluationValue }) {
  const { isArabic, pick } = useLanguage();
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const bonus = Number.isFinite(evaluation.bonus) ? evaluation.bonus : evaluation.bouns;
  const updatedAt = formattedDate(evaluation.updatedAt, locale, true);
  return <div className="space-y-4">
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label={pick("الحضور", "Attendance")} value={attendanceLabels[evaluation.attendance]} />
      <Metric label={pick("المشاركة", "Participation")} value={ratingLabels[evaluation.participation]} />
      <Metric label={pick("الواجب", "Homework")} value={ratingLabels[evaluation.homework]} />
      <Metric label={pick("السلوك", "Behavior")} value={ratingLabels[evaluation.behavior]} />
    </dl>
    <div className="flex flex-wrap gap-2 text-sm">
      <Badge variant="secondary">{pick("النقاط الإضافية", "Bonus")}: {bonus}</Badge>
      <Badge variant="outline">{evaluation.createdByRole === "teacher" ? pick("تم بواسطة معلم", "Created by teacher") : pick("تم بواسطة مشرف", "Created by supervisor")}</Badge>
    </div>
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{pick("الملاحظات", "Notes")}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{evaluation.notes?.trim() || pick("لا توجد ملاحظات", "No notes")}</p>
    </div>
    {updatedAt && <p className="text-xs text-muted-foreground">{pick("آخر تحديث", "Last updated")}: {updatedAt}</p>}
  </div>;
}

const Metric = ({ label, value }: { label: string; value: string }) => <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;

function WeekSection({ response }: { response: StudentEvaluationsResponse }) {
  const { isArabic, pick } = useLanguage();
  const { data } = response;
  const weekStart = formattedDate(data.weekStart, isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory");
  return <section className="space-y-4" aria-labelledby={`evaluation-week-${data.week}`}>
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="space-y-3 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle id={`evaluation-week-${data.week}`} className="text-xl">{pick(`الأسبوع ${data.week}`, `Week ${data.week}`)}</CardTitle>
          {weekStart && <span className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{weekStart}</span>}
        </div>
        {data.mode === "egyptian" && <div className="flex flex-wrap gap-2 text-sm text-muted-foreground"><span>{data.curriculum.name}</span><span>•</span><span>{data.grade.name}</span>{data.classroom.name && <><span>•</span><span>{pick("السياق العام", "General context")}: {data.classroom.name}</span></>}</div>}
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6">
        {data.mode === "egyptian" ? data.subjects.map((subject) => <Card key={subject.id} className="min-w-0"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="break-words text-base">{subject.name}</CardTitle><Badge variant={subject.evaluation ? "default" : "secondary"}>{subject.evaluation ? pick("تم التقييم", "Evaluated") : pick("لم يتم التقييم", "Not evaluated")}</Badge></div></CardHeader><CardContent>{subject.status === "evaluated" && subject.evaluation ? <EvaluationDetails evaluation={subject.evaluation} /> : <p className="text-sm text-muted-foreground">{pick("لم يتم تقييم المادة بعد", "This subject has not been evaluated yet")}</p>}</CardContent></Card>)
          : data.classrooms.map((classroom) => <Card key={classroom.id} className="min-w-0"><CardHeader className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="break-words text-base">{classroom.name}</CardTitle><Badge variant={classroom.evaluation ? "default" : "secondary"}>{classroom.evaluationStatus === "evaluated" ? pick("تم التقييم", "Evaluated") : classroom.evaluationStatus === "not_available" ? pick("غير متاح", "Unavailable") : pick("لم يتم التقييم", "Not evaluated")}</Badge></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{classroom.curriculum?.name && <span>{classroom.curriculum.name}</span>}{classroom.grade?.name && <span>• {classroom.grade.name}</span>}{classroom.subject?.name && <span>• {classroom.subject.name}</span>}</div></CardHeader><CardContent>{classroom.evaluationStatus === "evaluated" && classroom.evaluation ? <EvaluationDetails evaluation={classroom.evaluation} /> : <p className="text-sm text-muted-foreground">{classroom.evaluationStatus === "not_available" ? pick("التقييم غير متاح لهذه المادة", "Evaluation is unavailable for this subject") : pick("لم يتم تقييم المادة بعد", "This subject has not been evaluated yet")}</p>}</CardContent></Card>)}
        {((data.mode === "egyptian" && data.subjects.length === 0) || (data.mode === "gulf" && data.classrooms.length === 0)) && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{pick("لا توجد عناصر تقييم لهذا الأسبوع", "No evaluation items for this week")}</p>}
      </CardContent>
    </Card>
  </section>;
}

const InitialSkeleton = () => <div className="space-y-4" aria-label="جاري تحميل سجل التقييمات"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;

const errorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.code === "STUDENT_NOT_ENROLLED_IN_CLASSROOM") return "لا يوجد فصل دراسي معتمد لعرض التقييمات.";
  if (error instanceof ApiError && error.code === "CLASSROOM_PLAN_DAY_BEFORE_START") return "لم تبدأ خطة التقييمات الدراسية بعد.";
  if (error instanceof ApiError && error.code === "ACTION_DENIED") return "لا تملك صلاحية عرض هذه التقييمات.";
  if (error instanceof ApiError && error.code === "STUDENT_NOT_FOUND") return "تعذر العثور على بيانات الطالب.";
  if (error instanceof ApiError && error.code === "GULF_CLASSROOM_SUBJECT_DATA_CONFLICT") return "تعذر عرض التقييمات بسبب تعارض في بيانات المادة.";
  return "تعذر تحميل سجل التقييمات.";
};

export default function StudentEvaluationHistory() {
  const { pick } = useLanguage();
  const query = useInfiniteQuery({
    queryKey: studentEvaluationKeys.all,
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => studentEvaluationsApi.getMyWeeklyEvaluations(pageParam === null ? {} : { week: pageParam }),
    getNextPageParam: (lastPage) => lastPage.data.week > 1 ? lastPage.data.week - 1 : undefined,
    retry: false,
  });

  if (query.isPending) return <DashboardLayout><div className="mx-auto w-full max-w-6xl"><InitialSkeleton /></div></DashboardLayout>;
  if (!query.data) return <DashboardLayout><div className="mx-auto grid min-h-[55vh] w-full max-w-3xl place-items-center"><Card className="w-full"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><p className="font-semibold text-destructive">{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card></div></DashboardLayout>;

  const pages = Array.from(new Map(query.data.pages.map((page) => [page.data.week, page])).values());
  const reachedFirstWeek = pages.some((page) => page.data.week === 1);
  return <DashboardLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("سجل التقييمات", "Evaluation history")}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{pick("تابع تقييماتك الأسبوعية حسب البيانات المسجلة.", "Review your recorded weekly evaluations.")}</p></div></div></header>
    {pages.map((page) => <WeekSection key={page.data.week} response={page} />)}
    {query.isFetchNextPageError && <Card><CardContent className="flex flex-col items-center gap-3 p-6 text-center"><p className="text-sm text-destructive">{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}><RefreshCw className="h-4 w-4" />{pick("إعادة محاولة تحميل الأسبوع السابق", "Retry previous week")}</Button></CardContent></Card>}
    {!query.isFetchNextPageError && <div className="flex justify-center">{reachedFirstWeek || !query.hasNextPage ? <p className="rounded-xl bg-muted/50 px-5 py-3 text-sm text-muted-foreground">{pick("لا توجد أسابيع أقدم", "No older weeks")}</p> : <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage ? pick("جاري تحميل الأسبوع السابق...", "Loading previous week...") : pick("تحميل الأسبوع السابق", "Load previous week")}</Button>}</div>}
  </div></DashboardLayout>;
}
