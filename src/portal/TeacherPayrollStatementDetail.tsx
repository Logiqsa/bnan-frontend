import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, Download, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { teacherPayrollStatementsApi, type TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import PayrollReceiptButton from "@/components/PayrollReceiptButton";
import PayrollStatementBreakdown from "@/components/PayrollStatementBreakdown";
import PayrollStatementPrint from "@/components/PayrollStatementPrint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatPayrollStatementMoney, payrollStatementCurrencyName, payrollStatementCurrencySymbol } from "@/lib/payrollStatementCurrency";
import { printPayrollStatement } from "@/lib/printPayrollStatement";

const date = (value: string | null | undefined, locale: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";
const money = (value: number, currency: string, locale: string) => formatPayrollStatementMoney(value, currency, locale);
const status = (value: TeacherPayrollStatement["status"], pick: (ar: string, en: string) => string) => value === "paid" ? pick("مدفوع", "Paid") : value === "cancelled" ? pick("ملغي", "Cancelled") : pick("مرسل", "Sent");

export default function TeacherPayrollStatementDetail() {
  const { statementId = "" } = useParams<{ statementId: string }>();
  const { pick, language } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const query = useQuery({ queryKey: ["teacher-payroll-statement", statementId], queryFn: () => teacherPayrollStatementsApi.get(statementId), enabled: Boolean(statementId), retry: 1 });
  const statement = query.data;
  return <DashboardLayout><div className="mx-auto w-full max-w-5xl space-y-5" dir="rtl">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Banknote className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">كشف المستحقات</h1><p className="text-sm text-muted-foreground">التفاصيل المحفوظة كما أرسلتها الإدارة</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" onClick={printPayrollStatement} disabled={!statement}><Download className="me-2 h-4 w-4" />تحميل الكشف</Button><Button asChild variant="outline"><Link to="/portal/teacher/payroll"><ArrowRight className="me-2 h-4 w-4" />{pick("العودة للكشوف", "Back to statements")}</Link></Button></div></header>
    {query.isLoading ? <Skeleton className="h-96" /> : query.isError || !statement ? <Card><CardContent className="space-y-3 p-8 text-center"><p className="text-destructive">تعذر تحميل كشف المستحقات.</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card> : <div className="space-y-4">
      <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">الفترة</p><p className="font-semibold">{date(statement.period.from, locale)} — {date(statement.period.to, locale)}</p></div><div><p className="text-xs text-muted-foreground">المنهج</p><p className="font-semibold">{statement.curriculum.name || "—"}</p></div><div><p className="text-xs text-muted-foreground">الحالة</p><Badge>{status(statement.status, pick)}</Badge></div><div><p className="text-xs text-muted-foreground">تاريخ الإرسال</p><p className="font-semibold">{date(statement.sentAt, locale)}</p></div></CardContent></Card>
      <PayrollStatementBreakdown general={statement.generalSubscription} courses={statement.courses} currency={statement.currency} />
      <Card><CardHeader><CardTitle>الإجماليات</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4"><p>المكافآت: <strong>{money(statement.bonuses, statement.currency, locale)}</strong></p><p>الخصومات: <strong>{money(statement.deductions, statement.currency, locale)}</strong></p><p>العملة: <strong>{payrollStatementCurrencyName(statement.currency)} ({payrollStatementCurrencySymbol(statement.currency)})</strong></p><p className="font-bold">الإجمالي: <strong>{money(statement.finalAmount, statement.currency, locale)}</strong></p></CardContent></Card>
      <Card><CardHeader><CardTitle>الدفع</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{statement.payment ? <><p className="font-semibold text-green-700">تم الدفع</p><p>المبلغ: {money(statement.payment.amount, statement.payment.currency || statement.currency, locale)}</p><p>تاريخ الدفع: {date(statement.payment.paidAt, locale)}</p><p>الطريقة: {statement.payment.method}</p><p>اسم الحساب: {statement.payment.methodSnapshot.accountHolderName}</p>{statement.payment.paymentReference && <p className="break-all">مرجع الدفع: {statement.payment.paymentReference}</p>}{statement.payment.hasReceipt && <PayrollReceiptButton fetchReceipt={() => teacherPayrollStatementsApi.getReceipt(statement.id)} />}</> : <p>في انتظار الدفع</p>}</CardContent></Card>
    </div>}
    {statement && <PayrollStatementPrint statement={statement} />}
  </div></DashboardLayout>;
}
