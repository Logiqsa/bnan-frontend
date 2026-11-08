import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { teacherPayrollStatementsApi, type TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import PayrollStatementBreakdown from "@/components/PayrollStatementBreakdown";
import PayrollDeductionBreakdown from "@/components/PayrollDeductionBreakdown";
import PayrollStatementPrint from "@/components/PayrollStatementPrint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const receiptQuery = useQuery({
    queryKey: ["teacher-payroll-statement-receipt", statementId],
    queryFn: () => teacherPayrollStatementsApi.getReceipt(statementId),
    enabled: Boolean(statementId && statement?.payment?.hasReceipt),
    retry: 1,
  });
  const [receiptPreview, setReceiptPreview] = useState<{ url: string; isImage: boolean } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (!receiptQuery.data) {
      setReceiptPreview(null);
      return;
    }
    const url = URL.createObjectURL(receiptQuery.data);
    setReceiptPreview({ url, isImage: receiptQuery.data.type.startsWith("image/") });
    return () => URL.revokeObjectURL(url);
  }, [receiptQuery.data]);

  return <DashboardLayout><div className="mx-auto w-full max-w-5xl space-y-5" dir="rtl">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Banknote className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">كشف المستحقات</h1><p className="text-sm text-muted-foreground">التفاصيل المحفوظة كما أرسلتها الإدارة</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" onClick={printPayrollStatement} disabled={!statement}><Download className="me-2 h-4 w-4" />تحميل الكشف</Button><Button asChild variant="outline"><Link to="/portal/teacher/payroll"><ArrowRight className="me-2 h-4 w-4" />{pick("العودة للكشوف", "Back to statements")}</Link></Button></div></header>
    {query.isLoading ? <Skeleton className="h-96" /> : query.isError || !statement ? <Card><CardContent className="space-y-3 p-8 text-center"><p className="text-destructive">تعذر تحميل كشف المستحقات.</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card> : <div className="space-y-4">
      <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">الفترة</p><p className="font-semibold">{date(statement.period.from, locale)} — {date(statement.period.to, locale)}</p></div><div><p className="text-xs text-muted-foreground">المنهج</p><p className="font-semibold">{statement.curriculum.name || "—"}</p></div><div><p className="text-xs text-muted-foreground">الحالة</p><Badge>{status(statement.status, pick)}</Badge></div><div><p className="text-xs text-muted-foreground">تاريخ الإرسال</p><p className="font-semibold">{date(statement.sentAt, locale)}</p></div></CardContent></Card>
      <PayrollStatementBreakdown general={statement.generalSubscription} courses={statement.courses} currency={statement.currency} />
      <PayrollDeductionBreakdown statement={statement} />
      <Card><CardHeader><CardTitle>الإجماليات</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4"><p>المكافآت: <strong>{money(statement.bonuses, statement.currency, locale)}</strong></p><p>الخصومات: <strong>{money(statement.deductions, statement.currency, locale)}</strong></p><p>العملة: <strong>{payrollStatementCurrencyName(statement.currency)} ({payrollStatementCurrencySymbol(statement.currency)})</strong></p><p className="font-bold">الإجمالي: <strong>{money(statement.finalAmount, statement.currency, locale)}</strong></p></CardContent></Card>
      <Card><CardHeader><CardTitle>الدفع</CardTitle></CardHeader><CardContent className="text-sm">{statement.payment ? <div className="flex items-center justify-between gap-4"><div className="min-w-0 flex-1 space-y-2"><p className="font-semibold text-green-700">تم الدفع</p><p>المبلغ: {money(statement.payment.amount, statement.payment.currency || statement.currency, locale)}</p><p>تاريخ الدفع: {date(statement.payment.paidAt, locale)}</p><p>الطريقة: {statement.payment.method}</p><p>اسم الحساب: {statement.payment.methodSnapshot.accountHolderName}</p>{statement.payment.paymentReference && <p className="break-all">مرجع الدفع: {statement.payment.paymentReference}</p>}</div>{statement.payment.hasReceipt && <button type="button" className="group relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted/30 text-muted-foreground transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => receiptPreview && setReceiptOpen(true)} disabled={!receiptPreview} aria-label="معاينة إيصال الدفع">{receiptQuery.isLoading ? <><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">جاري تحميل إيصال الدفع</span></> : receiptPreview?.isImage ? <img src={receiptPreview.url} alt="إيصال الدفع" className="h-full w-full object-contain" /> : receiptPreview ? <><FileText className="h-9 w-9" /><span className="absolute inset-x-1 bottom-1 truncate text-center text-xs">إيصال PDF</span></> : <><FileText className="h-8 w-8" /><span className="absolute inset-x-1 bottom-1 text-center text-xs">تعذر تحميل الإيصال</span></>}</button>}</div> : <p>في انتظار الدفع</p>}</CardContent></Card>
    </div>}
    {statement && <PayrollStatementPrint statement={statement} />}
    <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
      <DialogContent className="max-w-4xl overflow-hidden p-3 sm:p-4">
        <DialogHeader className="px-2 pt-1"><DialogTitle>إيصال الدفع</DialogTitle><DialogDescription>معاينة الإيصال داخل الموقع</DialogDescription></DialogHeader>
        {receiptPreview?.isImage ? <div className="flex max-h-[72vh] items-center justify-center overflow-auto rounded-lg bg-muted/30 p-2"><img src={receiptPreview.url} alt="إيصال الدفع" className="max-h-[68vh] max-w-full object-contain" /></div> : receiptPreview && <iframe title="إيصال الدفع" src={receiptPreview.url} className="h-[72vh] w-full rounded-lg border bg-white" />}
      </DialogContent>
    </Dialog>
  </div></DashboardLayout>;
}
