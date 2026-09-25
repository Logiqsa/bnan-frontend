import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, ExternalLink, RefreshCw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "@/api/client";
import { teacherPayrollApi, type TeacherPayroll, type TeacherPayrollStatus } from "@/api/teacherPayrollApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";

const formatAmount = (value: number, currency: string, locale: string) =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${currency}`;

const formatDate = (value: string | undefined, locale: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
};

const receiptHref = (value?: string) => {
  if (!value) return null;
  try {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const url = new URL(value, `${origin}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

const TeacherPayroll = () => {
  const { pick, language } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const { payrollId } = useParams<{ payrollId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusValue = searchParams.get("status");
  const status: TeacherPayrollStatus | undefined = statusValue === "draft" || statusValue === "paid" ? statusValue : undefined;
  const backUrl = `/portal/teacher/payroll${status ? `?status=${status}` : ""}`;
  const list = useQuery({
    queryKey: ["teacher-payrolls", status || "all"],
    queryFn: () => teacherPayrollApi.list(status),
    enabled: !payrollId,
    staleTime: 30_000,
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ["teacher-payroll", payrollId],
    queryFn: () => teacherPayrollApi.get(payrollId!),
    enabled: Boolean(payrollId),
    staleTime: 30_000,
    retry: 1,
  });

  const statusBadge = (value: TeacherPayrollStatus) => (
    <Badge variant={value === "paid" ? "default" : "secondary"}>
      {value === "paid" ? pick("مدفوع", "Paid") : pick("قيد التجهيز", "In preparation")}
    </Badge>
  );
  const periodLabel = (payroll: TeacherPayroll) =>
    [formatDate(payroll.period.from, locale), formatDate(payroll.period.to, locale)].filter(Boolean).join(" — ");
  const moneyRow = (label: string, amount: number, currency: string, prominent = false) => (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${prominent ? "border-t pt-3 font-bold" : ""}`}>
      <span>{label}</span>
      <span dir="ltr" className="whitespace-nowrap">{formatAmount(amount, currency, locale)}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Banknote className="h-6 w-6" /></span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{payrollId ? pick("تفاصيل كشف الراتب", "Payroll details") : pick("مستحقاتي", "My earnings")}</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{pick("الكشوف التي أعدتها الإدارة فقط؛ لا تمثل تقديرًا لكل الحصص المنفذة.", "Only payroll records prepared by administration, not an estimate of all completed sessions.")}</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link to={payrollId ? backUrl : "/portal/teacher"}><ArrowRight className="me-2 h-4 w-4" />{payrollId ? pick("العودة للكشوف", "Back to payrolls") : pick("العودة للرئيسية", "Back to dashboard")}</Link>
          </Button>
        </header>

        {payrollId ? (
          detail.isLoading ? <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>
          : detail.isError ? <Card><CardContent className="space-y-3 p-6 text-center"><p className="text-sm text-destructive">{pick("تعذر تحميل كشف الراتب أو أنه غير متاح.", "Unable to load this payroll record, or it is unavailable.")}</p><Button variant="outline" onClick={() => void detail.refetch()}><RefreshCw className="me-2 h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
          : detail.data && <div className="space-y-4">
            <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">{pick("الفترة", "Period")}</p><p className="mt-1 font-semibold">{periodLabel(detail.data)}</p></div>
              <div><p className="text-xs text-muted-foreground">{pick("الحالة", "Status")}</p><div className="mt-1">{statusBadge(detail.data.status)}</div></div>
              <div><p className="text-xs text-muted-foreground">{pick("العملة", "Currency")}</p><p className="mt-1 font-semibold" dir="ltr">{detail.data.currency}</p></div>
              <div><p className="text-xs text-muted-foreground">{pick("تاريخ إعداد الكشف", "Created")}</p><p className="mt-1 font-semibold">{formatDate(detail.data.createdAt, locale) || "—"}</p></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>{pick("تفاصيل العمل", "Work breakdown")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
              {detail.data.workItems.map((item, index) => <div key={`${item.curriculumId}-${item.gradeId || index}`} className="min-w-0 space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{item.curriculumName}</p>{item.gradeName && <p className="break-words text-xs text-muted-foreground">{item.gradeName}</p>}</div><Badge variant="outline">{item.system === "gulf" ? pick("خليجي", "Gulf") : pick("مصري", "Egyptian")}</Badge></div>
                <p>{pick("عدد الحصص", "Sessions")}: {item.sessionsCount}</p>
                {item.minutes !== null && <p>{pick("مدة التدريس", "Teaching duration")}: {item.displayDuration || `${item.minutes} ${pick("دقيقة", "minutes")}`}</p>}
                <p>{item.rateType === "hour" ? pick("سعر الساعة", "Hourly rate") : pick("سعر الحصة", "Session rate")}: <span dir="ltr">{formatAmount(item.rate, detail.data.currency, locale)}</span></p>
                <p className="border-t pt-2 font-semibold">{pick("المبلغ", "Amount")}: <span dir="ltr">{formatAmount(item.amount, detail.data.currency, locale)}</span></p>
              </div>)}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>{pick("الإجماليات", "Totals")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
              {moneyRow(pick("الخليجي", "Gulf"), detail.data.totals.gulfAmount, detail.data.currency)}
              {moneyRow(pick("المصري", "Egyptian"), detail.data.totals.egyptianAmount, detail.data.currency)}
              {moneyRow(pick("المجموع الفرعي", "Subtotal"), detail.data.totals.subtotal, detail.data.currency)}
              {moneyRow(pick("المكافآت", "Bonuses"), detail.data.totals.bonus, detail.data.currency)}
              {moneyRow(pick("الخصومات", "Deductions"), detail.data.totals.deduction, detail.data.currency)}
              {moneyRow(pick("الإجمالي", "Total"), detail.data.totals.total, detail.data.currency, true)}
              {detail.data.adjustmentNote && <p className="break-words text-muted-foreground">{detail.data.adjustmentNote}</p>}
              {detail.data.notes && <p className="break-words text-muted-foreground">{detail.data.notes}</p>}
            </CardContent></Card>
            {detail.data.status === "paid" && detail.data.payment && <Card><CardHeader><CardTitle>{pick("تفاصيل التحويل", "Payment details")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <p>{pick("وسيلة التحويل", "Method")}: {detail.data.payment.method}</p>
              {detail.data.payment.paidAt && <p>{pick("تاريخ الدفع", "Payment date")}: {formatDate(detail.data.payment.paidAt, locale)}</p>}
              {detail.data.payment.transactionReference && <p className="break-all">{pick("رقم العملية", "Transaction reference")}: {detail.data.payment.transactionReference}</p>}
              {receiptHref(detail.data.payment.receiptUrl) && <Button asChild variant="outline" size="sm"><a href={receiptHref(detail.data.payment.receiptUrl)!} target="_blank" rel="noreferrer"><ExternalLink className="me-2 h-4 w-4" />{pick("عرض إيصال الدفع", "View payment receipt")}</a></Button>}
            </CardContent></Card>}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label={pick("تصفية الكشوف", "Filter payrolls")}>
              {([undefined, "draft", "paid"] as const).map((value) => <Button key={value || "all"} size="sm" variant={status === value ? "default" : "outline"} onClick={() => setSearchParams(value ? { status: value } : {})}>
                {value === "draft" ? pick("قيد التجهيز", "In preparation") : value === "paid" ? pick("مدفوع", "Paid") : pick("الكل", "All")}
              </Button>)}
            </div>
            {list.isLoading ? <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
            : list.isError ? <Card><CardContent className="space-y-3 p-6 text-center"><p className="text-sm text-destructive">{pick("تعذر تحميل كشوف الرواتب.", "Unable to load payroll records.")}</p><Button variant="outline" onClick={() => void list.refetch()}><RefreshCw className="me-2 h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
            : <>
              {!!list.data?.summary.length && <div className="grid gap-4 md:grid-cols-2">{list.data.summary.map((item) => <Card key={item.currency}><CardHeader><CardTitle dir="ltr" className="text-lg">{item.currency}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><span>{pick("عدد الكشوف", "Payroll records")}</span><span>{item.payrollsCount}</span></div>
                {moneyRow(pick("قيد التجهيز", "In preparation"), item.draftAmount, item.currency)}
                {moneyRow(pick("مدفوع", "Paid"), item.paidAmount, item.currency)}
                {moneyRow(pick("الإجمالي", "Total"), item.totalAmount, item.currency, true)}
              </CardContent></Card>)}</div>}
              {!list.data?.payrolls.length ? <Card><CardContent className="space-y-2 p-8 text-center"><p className="font-semibold">{pick("لا توجد كشوف رواتب متاحة حاليًا.", "No payroll records are available right now.")}</p><p className="text-sm text-muted-foreground">{pick("ستظهر هنا بعد إعدادها من الإدارة.", "They will appear here after administration prepares them.")}</p></CardContent></Card>
              : <div className="grid gap-4 md:grid-cols-2">{list.data.payrolls.map((payroll) => <Card key={payroll.id} className="min-w-0"><CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2"><p className="break-words font-semibold">{periodLabel(payroll)}</p>{statusBadge(payroll.status)}</div>
                <p className="text-lg font-bold" dir="ltr">{formatAmount(payroll.totals.total, payroll.currency, locale)}</p>
                <p className="text-xs text-muted-foreground">{pick("تاريخ إعداد الكشف", "Created")}: {formatDate(payroll.createdAt, locale) || "—"}</p>
                {payroll.status === "paid" && payroll.payment?.paidAt && <p className="text-xs text-muted-foreground">{pick("تاريخ الدفع", "Paid on")}: {formatDate(payroll.payment.paidAt, locale)}</p>}
                <Button asChild variant="outline" size="sm"><Link to={`/portal/teacher/payroll/${encodeURIComponent(payroll.id)}${status ? `?status=${status}` : ""}`}>{pick("عرض التفاصيل", "View details")}</Link></Button>
              </CardContent></Card>)}</div>}
            </>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherPayroll;
