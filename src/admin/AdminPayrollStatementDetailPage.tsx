import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { adminPayrollApi, type PayrollStatementTeacher } from "@/api/adminPayrollApi";
import PayrollReceiptButton from "@/components/PayrollReceiptButton";
import PayrollStatementBreakdown from "@/components/PayrollStatementBreakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { courseError } from "@/lib/courseUi";
import { formatPayrollStatementMoney, payrollStatementCurrencyName, payrollStatementCurrencySymbol } from "@/lib/payrollStatementCurrency";
import TeacherPayrollStatement from "./TeacherPayrollStatement";

const date = (value: string | null | undefined, locale: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";
const money = (value: number, currency: string, locale: string) => formatPayrollStatementMoney(value, currency, locale);

export default function AdminPayrollStatementDetailPage() {
  const { statementId = "" } = useParams<{ statementId: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const query = useQuery({ queryKey: ["admin-payroll-statement", statementId], queryFn: () => adminPayrollApi.getStatement(statementId), enabled: Boolean(statementId), retry: 1 });
  const statement = query.data;
  const [courseRates, setCourseRates] = useState<Record<string, string>>({});
  const [gradeRates, setGradeRates] = useState<Record<string, string>>({});
  const savedCourseRates = useMemo(() => Object.fromEntries((statement?.courses || []).map((course) => [course.course, String(course.hourlyRate)])), [statement]);
  const savedGradeRates = useMemo(() => Object.fromEntries((statement?.generalSubscription.gradeGroups || []).map((group) => [group.gradeId, String(group.hourlyRate ?? 0)])), [statement]);
  const editorStatement = useMemo<PayrollStatementTeacher | null>(() => statement ? ({
    teacherId: statement.teacher.id,
    fullName: statement.teacher.fullName,
    email: statement.teacher.email,
    general: { minutes: statement.generalSubscription.hours * 60, displayDuration: "", sessionsCount: statement.generalSubscription.sessions?.length || 0, items: [], gradeGroups: statement.generalSubscription.gradeGroups, sessions: statement.generalSubscription.sessions },
    courses: statement.courses.map((course) => ({ courseId: course.course, courseName: course.courseName, minutes: course.hours * 60, displayDuration: "", sessionsCount: course.sessions?.length || 0, sessions: course.sessions })),
    excludedSessionsCount: 0,
    excludedSessions: [],
    payroll: { id: statement.id, status: "draft", currency: statement.currency, bonus: statement.bonuses, deduction: statement.deductions, total: statement.finalAmount, generalAmount: statement.generalSubscription.amount },
  }) : null, [statement]);
  const update = useMutation({
    mutationFn: () => adminPayrollApi.updateStatement(statementId, {
      gradeRates: (statement?.generalSubscription.gradeGroups || []).map((group) => ({ gradeId: group.gradeId, hourlyRate: Number(gradeRates[group.gradeId] ?? group.hourlyRate ?? 0) })),
      courseRates: (statement?.courses || []).map((course) => ({ courseId: course.course, hourlyRate: Number(courseRates[course.course] ?? course.hourlyRate) })),
      bonuses: statement?.bonuses,
      deductions: statement?.deductions,
    }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["admin-payroll-statement", statementId], data);
      await queryClient.invalidateQueries({ queryKey: ["admin-payroll-statements"] });
      toast.success("تم حفظ تعديلات الكشف.");
    },
    onError: (error) => toast.error(courseError(error)),
  });
  const editMode = searchParams.get("edit") === "1" && statement?.status === "draft" && !statement.sentAt && !statement.payment;
  return <DashboardLayout><div className="mx-auto w-full max-w-5xl space-y-5" dir="rtl"><header className="flex items-center justify-between rounded-2xl border bg-card p-5"><div><h1 className="text-2xl font-bold">كشف مستحقات المعلم</h1><p className="text-sm text-muted-foreground">{statement?.status === "draft" ? "مسودة قابلة للتعديل قبل الإرسال" : "الكشف المحفوظ كما تم إرساله"}</p></div><Button asChild variant="outline"><Link to="/admin/payroll?view=sent"><ArrowRight className="me-2 h-4 w-4" />العودة للكشوف</Link></Button></header>{query.isLoading ? <Skeleton className="h-96" /> : query.isError || !statement ? <Card><CardContent className="space-y-3 p-8 text-center"><p className="text-destructive">تعذر تحميل الكشف.</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card> : editMode && editorStatement ? <TeacherPayrollStatement statement={editorStatement} curriculumName={statement.curriculum.name || "—"} period={statement.period} currency={statement.currency as "EGP" | "SAR"} initialCourseRates={savedCourseRates} initialGradeRates={savedGradeRates} onRatesChange={setCourseRates} onGradeRatesChange={setGradeRates} onSend={() => update.mutate()} sending={update.isPending} actionLabel="حفظ التعديلات" /> : <div className="space-y-4"><Card><CardContent className="grid gap-4 p-5 sm:grid-cols-5"><div><p className="text-xs text-muted-foreground">المعلم</p><p className="font-semibold">{statement.teacher.fullName || statement.teacher.email || "—"}</p></div><div><p className="text-xs text-muted-foreground">المنهج</p><p>{statement.curriculum.name || "—"}</p></div><div><p className="text-xs text-muted-foreground">الفترة</p><p>{date(statement.period.from, locale)} — {date(statement.period.to, locale)}</p></div><div><p className="text-xs text-muted-foreground">العملة</p><p>{payrollStatementCurrencyName(statement.currency)} ({payrollStatementCurrencySymbol(statement.currency)})</p></div><div><p className="text-xs text-muted-foreground">المبلغ</p><p className="font-bold" dir="ltr">{money(statement.finalAmount, statement.currency, locale)}</p></div></CardContent></Card><PayrollStatementBreakdown general={statement.generalSubscription} courses={statement.courses} currency={statement.currency} /><Card><CardHeader><CardTitle>الدفع</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{statement.payment ? <><p className="font-semibold text-green-700">تم الدفع في {date(statement.payment.paidAt, locale)}</p><p>المبلغ: {money(statement.payment.amount, statement.payment.currency || statement.currency, locale)}</p><p>الطريقة: {statement.payment.method}</p><p>اسم الحساب: {statement.payment.methodSnapshot.accountHolderName}</p>{statement.payment.paymentReference && <p>مرجع الدفع: {statement.payment.paymentReference}</p>}{statement.payment.hasReceipt && <PayrollReceiptButton fetchReceipt={() => adminPayrollApi.getStatementReceipt(statement.id)} />}</> : <p>{statement.status === "draft" ? "لم يتم إرسال هذه المسودة للمعلم بعد." : "الكشف مرسل ولم يتم تسجيل الدفع."}</p>}</CardContent></Card><Card><CardContent className="text-sm"><p>المكافآت: {money(statement.bonuses, statement.currency, locale)} · الخصومات: {money(statement.deductions, statement.currency, locale)}</p><p className="mt-2 text-lg font-bold">الإجمالي: {money(statement.finalAmount, statement.currency, locale)}</p></CardContent></Card></div>}</div></DashboardLayout>;
}
