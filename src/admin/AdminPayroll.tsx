import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminPayrollApi, type AdminPayroll, type PayrollDraftInput, type PayrollTeacherPreview } from "@/api/adminPayrollApi";
import { catalogApi } from "@/api/catalogApi";
import { API_BASE_URL } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { courseError } from "@/lib/courseUi";
import { findOverlappingTeacherStatement } from "@/lib/payrollStatementAvailability";
import type { PayrollStatementCurrency } from "@/lib/payrollStatementCurrency";
import TeacherPayrollStatement from "./TeacherPayrollStatement";
import AdminSentPayrollStatements from "./AdminSentPayrollStatements";
import PayrollReceiptButton from "@/components/PayrollReceiptButton";

const money = (value: number, currency: string, locale: string) =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${currency}`;
const safeReceipt = (value?: string) => {
  if (!value) return null;
  try {
    const url = new URL(value, `${API_BASE_URL.replace(/\/api\/v1\/?$/, "")}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

const StatusBadge = ({ status }: { status: AdminPayroll["status"] }) => {
  const { pick } = useLanguage();
  return <Badge variant={status === "paid" ? "default" : status === "cancelled" ? "destructive" : "secondary"}>
    {status === "paid" ? pick("مدفوع", "Paid") : status === "cancelled" ? pick("ملغي", "Cancelled") : pick("مسودة", "Draft")}
  </Badge>;
};

interface DraftEditorProps {
  preview?: PayrollTeacherPreview;
  payroll?: AdminPayroll;
  pending: boolean;
  submitLabel: string;
  onSubmit: (body: PayrollDraftInput) => void;
}

export const DraftEditor = ({ preview, payroll, pending, submitLabel, onSubmit }: DraftEditorProps) => {
  const { pick } = useLanguage();
  const items = useMemo(
    () => preview?.workItems || payroll?.workItems || [],
    [payroll?.workItems, preview?.workItems],
  );
  const [currency, setCurrency] = useState(payroll?.currency || "");
  const [bonus, setBonus] = useState(String(payroll?.totals.bonus ?? 0));
  const [deduction, setDeduction] = useState(String(payroll?.totals.deduction ?? 0));
  const [adjustmentNote, setAdjustmentNote] = useState(payroll?.adjustmentNote || "");
  const [notes, setNotes] = useState(payroll?.notes || "");
  const [rates, setRates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const curriculumGroups = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; items: typeof items }>();
    items.forEach((item) => {
      const group = groups.get(item.curriculumId);
      if (group) group.items.push(item);
      else groups.set(item.curriculumId, { id: item.curriculumId, name: item.curriculumName, items: [item] });
    });
    return [...groups.values()];
  }, [items]);
  const rateItems = useMemo(() => {
    const unique = new Map<string, (typeof items)[number]>();
    items.forEach((item) => {
      const key = item.gradeId || item.curriculumId;
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()];
  }, [items]);

  useEffect(() => {
    setRates(Object.fromEntries(items.map((item) => [item.gradeId || item.curriculumId, item.rate == null ? "" : String(item.rate)])));
  }, [items]);

  const submit = () => {
    const normalizedRates = rateItems.map((item) => ({
      gradeId: item.gradeId || item.curriculumId,
      rate: Number(rates[item.gradeId || item.curriculumId]),
    }));
    const bonusValue = Number(bonus);
    const deductionValue = Number(deduction);
    if (!/^[A-Za-z]{3}$/.test(currency.trim()) || normalizedRates.some((item) => rates[item.gradeId]?.trim() === "" || !Number.isFinite(item.rate) || item.rate < 0) ||
      !Number.isFinite(bonusValue) || bonusValue < 0 || !Number.isFinite(deductionValue) || deductionValue < 0) {
      setError(pick("راجع العملة والأسعار والمكافآت والخصومات.", "Check currency, rates, bonuses, and deductions."));
      return;
    }
    setError("");
    onSubmit({ rates: normalizedRates, currency: currency.trim().toUpperCase(), bonus: bonusValue, deduction: deductionValue,
      ...(adjustmentNote.trim() ? { adjustmentNote: adjustmentNote.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) });
  };

  return <div className="space-y-5">
    <section className="space-y-3" aria-labelledby="payroll-entitlements-title">
      <h3 id="payroll-entitlements-title" className="text-lg font-semibold">{pick("تفاصيل المستحقات", "Earnings details")}</h3>
      {items.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"><p>{preview?.summary.excludedSessionsCount ? pick("لا توجد تفاصيل مستحقات محتسبة لهذه الفترة.", "No calculated earnings details are available for this period.") : pick("لا توجد تفاصيل مستحقات لهذه الفترة", "No earnings details are available for this period")}</p>{Boolean(preview?.summary.excludedSessionsCount) && <p className="mt-2">{pick("يوجد عدد من الجلسات المستبعدة من الحساب.", "Some sessions were excluded from the calculation.")}</p>}</div>}
      {curriculumGroups.map((group) => <div key={group.id} className="space-y-3 rounded-xl border bg-muted/10 p-3 sm:p-4">
        <h4 className="break-words font-semibold">{group.name}</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {group.items.map((item) => { const key = item.gradeId || item.curriculumId; const firstForRate = rateItems.find((entry) => (entry.gradeId || entry.curriculumId) === key) === item; return <Card key={`${item.curriculumId}-${key}`} className="min-w-0">
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><div><p className="break-words font-semibold">{item.gradeName || pick("بدون اسم صف", "Unnamed grade")}</p><p className="text-xs text-muted-foreground">{item.rateType === "hour" ? pick("نوع الحساب: بالساعة", "Billing type: Hourly") : pick("نوع الحساب: بالجلسة", "Billing type: Per session")}</p></div><Badge variant="outline">{item.system === "gulf" ? pick("خليجي", "Gulf") : pick("مصري", "Egyptian")}</Badge></div>
              <p>{pick("عدد الجلسات", "Sessions")}: {item.sessionsCount}</p>
              {item.displayDuration && <p>{pick("عدد الساعات", "Duration")}: {item.displayDuration}</p>}
              {firstForRate ? <div className="space-y-1"><Label htmlFor={`rate-${key}`}>{pick("السعر", "Rate")}</Label><div className="flex items-center gap-2"><Input id={`rate-${key}`} aria-label={`${pick("السعر", "Rate")} - ${item.gradeName || key}`} type="number" min="0" step="0.01" value={rates[key] || ""} onChange={(event) => setRates((current) => ({ ...current, [key]: event.target.value }))} disabled={pending} /><span className="shrink-0 text-xs text-muted-foreground">{currency.trim().toUpperCase() || pick("العملة", "Currency")}</span></div></div> : <p className="text-xs text-muted-foreground">{pick("يستخدم هذا الصف نفس السعر المحدد له أعلاه.", "This grade uses the same rate entered above.")}</p>}
              {item.amount != null && <p className="font-semibold">{pick("المبلغ الحالي", "Current amount")}: {money(item.amount, currency, pick("ar-EG", "en-US"))}</p>}
            </CardContent>
          </Card>; })}
        </div>
      </div>)}
    </section>
    <div className="grid gap-3 sm:grid-cols-3">
      <div><Label htmlFor="payroll-currency">{pick("العملة", "Currency")}</Label><Input id="payroll-currency" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={pending} /></div>
      <div><Label htmlFor="payroll-bonus">{pick("المكافأة", "Bonus")}</Label><Input id="payroll-bonus" type="number" min="0" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} disabled={pending} /></div>
      <div><Label htmlFor="payroll-deduction">{pick("الخصم", "Deduction")}</Label><Input id="payroll-deduction" type="number" min="0" step="0.01" value={deduction} onChange={(e) => setDeduction(e.target.value)} disabled={pending} /></div>
    </div>
    <div><Label htmlFor="adjustment-note">{pick("ملاحظة التعديلات", "Adjustment note")}</Label><Textarea id="adjustment-note" value={adjustmentNote} onChange={(e) => setAdjustmentNote(e.target.value)} disabled={pending} /></div>
    <div><Label htmlFor="payroll-notes">{pick("ملاحظات", "Notes")}</Label><Textarea id="payroll-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={pending} /></div>
    <div className="rounded-xl border bg-muted/20 p-4 text-sm">
      <h3 className="mb-3 font-semibold">{pick("ملخص المسودة", "Draft summary")}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <p>{pick("عدد الصفوف", "Grades")}: <strong>{preview?.summary.gradesCount ?? rateItems.length}</strong></p>
        {preview && <p>{pick("الجلسات", "Sessions")}: <strong>{preview.summary.egyptianSessionsCount}</strong></p>}
        {preview && <p>{pick("الساعات الخليجية", "Gulf hours")}: <strong>{preview.summary.gulfDisplayDuration}</strong></p>}
        <p>{pick("المكافأة", "Bonus")}: <strong>{bonus || "0"} {currency.trim().toUpperCase()}</strong></p>
        <p>{pick("الخصم", "Deduction")}: <strong>{deduction || "0"} {currency.trim().toUpperCase()}</strong></p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{pick("الإجمالي النهائي يحسبه الخادم عند إنشاء المسودة.", "The backend calculates the authoritative total when the draft is created.")}</p>
    </div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <Button onClick={submit} disabled={pending || !items.length}>{pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{submitLabel}</Button>
  </div>;
};

export default function AdminPayroll() {
  const { payrollId } = useParams<{ payrollId: string }>();
  const [pageParams] = useSearchParams();
  const { pick, language } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const navigate = useNavigate();
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  const [activeView, setActiveView] = useState<"manage" | "sent">(() => pageParams.get("view") === "sent" ? "sent" : "manage");
  const [showCreate, setShowCreate] = useState(() => pageParams.get("create") === "1");
  const [from, setFrom] = useState(() => pageParams.get("from") || "");
  const [to, setTo] = useState(() => pageParams.get("to") || "");
  const [teacherId, setTeacherId] = useState("");
  const [statementTeacherId, setStatementTeacherId] = useState("");
  const [statementTeacherSearch, setStatementTeacherSearch] = useState(() => pageParams.get("teacherSearch") || "");
  const [curriculumId, setCurriculumId] = useState(() => pageParams.get("curriculumId") || "all");
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const submitLock = useRef(false);

  const list = useQuery({ queryKey: ["admin-payrolls", status || "all"], queryFn: () => adminPayrollApi.list({ status: status || undefined }), enabled: !payrollId && activeView === "manage", staleTime: 30_000, retry: 1, retryDelay: 0 });
  const detail = useQuery({ queryKey: ["admin-payroll", payrollId], queryFn: () => adminPayrollApi.get(payrollId!), enabled: Boolean(payrollId), retry: 1, retryDelay: 0 });
  const payrollCurricula = useQuery({ queryKey: ["admin-payroll-curricula"], queryFn: async () => (await catalogApi.curriculums()).data, enabled: activeView === "manage" && showCreate, staleTime: 5 * 60_000, retry: 1 });
  const preview = useQuery({ queryKey: ["admin-payroll-teacher-preview", teacherId, from, to], queryFn: () => adminPayrollApi.teacherPreview(teacherId, from, to), enabled: activeView === "manage" && showCreate && Boolean(teacherId && from && to && from <= to), retry: 1 });
  const statementPreview = useQuery({ queryKey: ["admin-payroll-statement", curriculumId, from, to], queryFn: () => adminPayrollApi.curriculumStatementPreview(curriculumId, from, to), enabled: activeView === "manage" && showCreate && curriculumId !== "all" && Boolean(from && to && from <= to), retry: 1 });
  const existingStatements = useQuery({ queryKey: ["admin-payroll-statements"], queryFn: () => adminPayrollApi.listStatements(), enabled: activeView === "manage" && showCreate && Boolean(from && to && from <= to), staleTime: 0, retry: 1 });
  const refresh = async (id?: string) => { await client.invalidateQueries({ queryKey: ["admin-payrolls"] }); if (id) await client.invalidateQueries({ queryKey: ["admin-payroll", id] }); };
  const create = useMutation({ mutationFn: (body: PayrollDraftInput) => adminPayrollApi.create({ ...body, teacherId, period: { from, to } }), onSuccess: async (item) => { await refresh(); toast.success(pick("تم إنشاء المسودة.", "Draft created.")); navigate(`/admin/payroll/${item.id}`); }, onError: (e) => toast.error(courseError(e)) });
  const update = useMutation({ mutationFn: (body: PayrollDraftInput) => adminPayrollApi.update(payrollId!, body), onSuccess: async () => { await refresh(payrollId); toast.success(pick("تم تحديث المسودة.", "Draft updated.")); }, onError: (e) => toast.error(courseError(e)) });
  const pay = useMutation({ mutationFn: () => adminPayrollApi.pay(payrollId!, { receipt: receipt!, paidAt: paidAt || undefined, transactionReference: reference, notes: paymentNotes }), onMutate: () => { submitLock.current = true; }, onSuccess: async () => { setPayOpen(false); await refresh(payrollId); toast.success(pick("تم تسجيل الدفع.", "Payment recorded.")); }, onError: (e) => toast.error(courseError(e)), onSettled: () => { submitLock.current = false; } });
  const payroll = detail.data;
  const filteredStatementTeachers = useMemo(() => {
    const search = statementTeacherSearch.trim().toLocaleLowerCase();
    if (!search) return statementPreview.data?.teachers || [];
    return (statementPreview.data?.teachers || []).filter((teacher) => `${teacher.fullName || ""} ${teacher.email || ""}`.toLocaleLowerCase().includes(search));
  }, [statementPreview.data?.teachers, statementTeacherSearch]);
  const date = (value?: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";
  const existingStatementLabel = (value: NonNullable<typeof existingStatements.data>[number]) => value.status === "draft"
    ? pick("مسودة موجودة", "Existing draft")
    : value.status === "paid"
      ? pick("مدفوع", "Paid")
      : value.status === "cancelled"
        ? pick("ملغي", "Cancelled")
        : value.status === "payment_pending"
          ? pick("قيد الدفع", "Payment pending")
          : pick("مرسل بالفعل", "Already sent");

  return <DashboardLayout><div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">{payrollId ? pick("تفاصيل كشف المعلم", "Payroll details") : pick("إدارة مستحقات المعلمين", "Teacher payroll management")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("إنشاء ومراجعة واعتماد كشوف المستحقات.", "Create, review, and pay teacher payrolls.")}</p></div>{payrollId ? <Button asChild variant="outline"><Link to="/admin/payroll"><ArrowRight className="me-2 h-4 w-4" />{pick("العودة", "Back")}</Link></Button> : <Button onClick={() => { setActiveView("manage"); setShowCreate(activeView === "sent" ? true : (value) => !value); }}><Plus className="me-2 h-4 w-4" />{pick("كشف جديد", "New payroll")}</Button>}</header>
    {!payrollId && <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1" role="tablist" aria-label={pick("أقسام مستحقات المعلمين", "Teacher payroll sections")}><Button role="tab" aria-selected={activeView === "manage"} variant={activeView === "manage" ? "default" : "ghost"} onClick={() => setActiveView("manage")} className="w-full">{pick("إنشاء ومراجعة الكشوف", "Create and review")}</Button><Button role="tab" aria-selected={activeView === "sent"} variant={activeView === "sent" ? "default" : "ghost"} onClick={() => setActiveView("sent")} className="w-full">{pick("الكشوفات المرسلة", "Sent statements")}</Button></div>}
    {payrollId ? detail.isLoading ? <Skeleton className="h-80" /> : detail.isError || !payroll ? <Card><CardContent className="p-8 text-center"><p className="text-destructive">{pick("تعذر تحميل الكشف.", "Unable to load payroll.")}</p><Button className="mt-3" variant="outline" onClick={() => void detail.refetch()}><RefreshCw className="me-2 h-4 w-4" />{pick("إعادة", "Retry")}</Button></CardContent></Card> : <div className="space-y-4">
      <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">{pick("المعلم", "Teacher")}</p><p className="font-semibold">{payroll.teacher.fullName || "—"}</p></div><div><p className="text-xs text-muted-foreground">{pick("الفترة", "Period")}</p><p>{date(payroll.period.from)} — {date(payroll.period.to)}</p></div><div><p className="text-xs text-muted-foreground">{pick("الحالة", "Status")}</p><StatusBadge status={payroll.status} /></div><div><p className="text-xs text-muted-foreground">{pick("الإجمالي", "Total")}</p><p className="font-bold" dir="ltr">{money(payroll.totals.total, payroll.currency, locale)}</p></div></CardContent></Card>
      {payroll.status === "draft" ? <Card><CardHeader><CardTitle>{pick("تعديل المسودة", "Edit draft")}</CardTitle></CardHeader><CardContent><DraftEditor payroll={payroll} pending={update.isPending} submitLabel={pick("حفظ التعديلات", "Save changes")} onSubmit={(body) => update.mutate(body)} /></CardContent></Card> : <WorkItems payroll={payroll} />}
      <Totals payroll={payroll} />
      {payroll.status === "draft" && <Card><CardContent className="p-5"><Button onClick={() => setPayOpen(true)}>{pick("تسجيل الكشف كمدفوع", "Mark as paid")}</Button></CardContent></Card>}
      {payroll.payment && <Card><CardHeader><CardTitle>{pick("بيانات الدفع", "Payment")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{pick("الطريقة", "Method")}: {payroll.payment.method}</p><p>{pick("تاريخ الدفع", "Paid at")}: {date(payroll.payment.paidAt)}</p>{payroll.payment.transactionReference && <p className="break-all">{pick("المرجع", "Reference")}: {payroll.payment.transactionReference}</p>}{safeReceipt(payroll.payment.receiptUrl) && <PayrollReceiptButton receiptUrl={safeReceipt(payroll.payment.receiptUrl)!} label={pick("عرض الإيصال", "View receipt")} />}</CardContent></Card>}
    </div> : activeView === "sent" ? <AdminSentPayrollStatements /> : <>
      {showCreate && <Card><CardHeader><CardTitle>{pick("إنشاء مسودة", "Create draft")}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="period-from">{pick("من", "From")}</Label><Input id="period-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setTeacherId(""); }} /></div><div><Label htmlFor="period-to">{pick("إلى", "To")}</Label><Input id="period-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setTeacherId(""); }} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="payroll-curriculum-filter">{pick("المنهج", "Curriculum")}</Label>{payrollCurricula.isFetching ? <div className="flex h-10 items-center rounded-md border px-3 text-sm text-muted-foreground">{pick("جاري تحميل المناهج...", "Loading curricula...")}</div> : payrollCurricula.isError ? <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-destructive/40 px-3 text-xs text-destructive"><span>{pick("تعذر تحميل المناهج.", "Unable to load curricula.")}</span><Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => void payrollCurricula.refetch()}>{pick("إعادة", "Retry")}</Button></div> : <select id="payroll-curriculum-filter" aria-label={pick("المنهج", "Curriculum")} value={curriculumId} onChange={(event) => { const next = event.target.value; setCurriculumId(next); setStatementTeacherId(""); setStatementTeacherSearch(""); setTeacherId(""); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">{pick("كل المناهج", "All curricula")}</option>{(payrollCurricula.data || []).map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.name}</option>)}</select>}</div>
        {curriculumId !== "all" && <Card><CardHeader><CardTitle>كشف مستحقات المعلمين حسب المنهج</CardTitle></CardHeader><CardContent>{statementPreview.isLoading ? <Skeleton className="h-24" /> : statementPreview.isError ? <p className="text-sm text-destructive">تعذر تحميل مستحقات المعلمين.</p> : !statementPreview.data?.teachers.length ? <p className="text-sm text-muted-foreground">لا يوجد معلمون مرتبطون بهذا المنهج.</p> : <div className="space-y-3"><div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Label htmlFor="statement-teacher-search">بحث عن المعلم</Label><Input id="statement-teacher-search" value={statementTeacherSearch} onChange={(event) => setStatementTeacherSearch(event.target.value)} placeholder="ابحث باسم المعلم أو البريد الإلكتروني" /></div>{statementTeacherSearch && <Button type="button" variant="outline" onClick={() => setStatementTeacherSearch("")}>مسح</Button>}</div>{existingStatements.isError && <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"><span>تعذر التحقق من الكشوف الموجودة؛ تم إيقاف إنشاء كشوف جديدة مؤقتًا.</span><Button type="button" size="sm" variant="outline" onClick={() => void existingStatements.refetch()}>إعادة المحاولة</Button></div>}{filteredStatementTeachers.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-right">المعلم</th><th className="p-3 text-right">ساعات الاشتراكات</th><th className="p-3 text-right">ساعات الدورات</th><th className="p-3 text-right">إجمالي الساعات</th><th className="p-3 text-right">حالة الكشف</th><th className="p-3 text-right">الإجراء</th></tr></thead><tbody>{filteredStatementTeachers.map((teacher) => { const courseMinutes = teacher.courses.reduce((sum, course) => sum + course.minutes, 0); const existing = findOverlappingTeacherStatement(existingStatements.data || [], teacher.teacherId, from, to); return <tr key={teacher.teacherId} className="border-b last:border-0"><td className="p-3">{teacher.fullName || teacher.email || "—"}</td><td className="p-3">{teacher.general.displayDuration}</td><td className="p-3">{(courseMinutes / 60).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} س</td><td className="p-3">{((teacher.general.minutes + courseMinutes) / 60).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} س</td><td className="p-3">{existing ? <div className="flex flex-col items-start gap-1"><Badge variant="secondary">{pick("الفترة متداخلة مع كشف موجود", "Period overlaps an existing statement")}</Badge><span className="text-xs text-muted-foreground">{existingStatementLabel(existing)}</span></div> : existingStatements.isLoading || existingStatements.isError ? <Badge variant="outline">جاري التحقق...</Badge> : <Badge variant="outline">متاح</Badge>}</td><td className="p-3">{existing ? <Button asChild size="sm" variant="outline"><Link to={`/admin/payroll/statements/${encodeURIComponent(existing.id)}`}>عرض الكشف</Link></Button> : <Button size="sm" variant="outline" disabled={existingStatements.isLoading || existingStatements.isError} onClick={() => { const query = new URLSearchParams({ curriculumId, from, to, teacherId: teacher.teacherId, teacherSearch: statementTeacherSearch, create: "1" }); navigate(`/admin/payroll/statement?${query}`); }}>عرض الكشف</Button>}</td></tr>; })}</tbody></table></div> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">لا يوجد معلم مطابق للبحث.</p>}</div>}</CardContent></Card>}

        {preview.isFetching && <Skeleton className="h-64" />}{preview.isError && <p className="text-sm text-destructive">{pick("تعذر تحميل معاينة المستحقات.", "Unable to load payroll preview.")}</p>}{preview.data && <><section className="space-y-3 rounded-xl border bg-muted/10 p-4" aria-labelledby="payroll-period-summary"><h3 id="payroll-period-summary" className="font-semibold">{pick("ملخص الفترة", "Period summary")}</h3><div className="grid gap-2 text-sm sm:grid-cols-3"><p>{pick("الصفوف", "Grades")}: <strong>{preview.data.summary.gradesCount}</strong></p><p>{pick("الجلسات المحتسبة", "Calculated sessions")}: <strong>{preview.data.summary.egyptianSessionsCount}</strong></p><p>{pick("الساعات المحتسبة", "Calculated hours")}: <strong>{preview.data.summary.gulfDisplayDuration}</strong></p></div>{preview.data.summary.excludedSessionsCount > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">⚠️ {pick("جلسات مستبعدة من الحساب", "Sessions excluded from calculation")}: {preview.data.summary.excludedSessionsCount}</p><p className="mt-1 text-xs">{pick("هذه الجلسات لم تدخل في تفاصيل المستحقات لأنها لا تستوفي شروط حساب الراتب.", "These sessions were not included in earnings details because they do not meet payroll calculation requirements.")}</p></div>}</section>{!preview.data.payoutProfile && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{pick("المعلم لم يضبط بيانات استلام المستحقات؛ يمكن إنشاء المسودة لكن لا يمكن تسجيل الدفع قبل ضبطها.", "The teacher has no payout profile; a draft can be created, but payment cannot be recorded yet.")}</p>}<DraftEditor preview={preview.data} pending={create.isPending} submitLabel={pick("إنشاء المسودة", "Create draft")} onSubmit={(body) => create.mutate(body)} /></>}
      </CardContent></Card>}
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={!status ? "default" : "outline"} onClick={() => setStatus("")}>{pick("الكل", "All")}</Button><Button size="sm" variant={status === "draft" ? "default" : "outline"} onClick={() => setStatus("draft")}>{pick("مسودات", "Drafts")}</Button><Button size="sm" variant={status === "paid" ? "default" : "outline"} onClick={() => setStatus("paid")}>{pick("مدفوعة", "Paid")}</Button></div>
      {list.isLoading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div> : list.isError ? <Card><CardContent className="p-8 text-center"><p className="text-destructive">{pick("تعذر تحميل الكشوف.", "Unable to load payrolls.")}</p><Button className="mt-3" variant="outline" onClick={() => void list.refetch()}>{pick("إعادة", "Retry")}</Button></CardContent></Card> : !list.data?.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">{pick("لا توجد كشوف.", "No payrolls found.")}</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{list.data.map((item) => <Card key={item.id}><CardContent className="space-y-3 p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.teacher.fullName || item.teacher.email || "—"}</p><p className="text-xs text-muted-foreground">{date(item.period.from)} — {date(item.period.to)}</p></div><StatusBadge status={item.status} /></div><p className="text-lg font-bold" dir="ltr">{money(item.totals.total, item.currency, locale)}</p><Button asChild size="sm" variant="outline"><Link to={`/admin/payroll/${encodeURIComponent(item.id)}`}>{pick("التفاصيل", "Details")}</Link></Button></CardContent></Card>)}</div>}
    </>}
    <AlertDialog open={payOpen} onOpenChange={(open) => { if (!pay.isPending) setPayOpen(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pick("تأكيد الدفع", "Confirm payment")}</AlertDialogTitle><AlertDialogDescription>{pick("سيصبح الكشف نهائيًا وغير قابل للتعديل.", "The payroll will become final and read-only.")}</AlertDialogDescription></AlertDialogHeader><div className="space-y-3"><div><Label htmlFor="receipt">{pick("صورة إيصال التحويل", "Transfer receipt")}</Label><Input id="receipt" type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} disabled={pay.isPending} /></div><div><Label htmlFor="paid-at">{pick("تاريخ الدفع", "Payment date")}</Label><Input id="paid-at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={pay.isPending} /></div><div><Label htmlFor="reference">{pick("رقم العملية", "Transaction reference")}</Label><Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} disabled={pay.isPending} /></div><div><Label htmlFor="payment-notes">{pick("ملاحظات", "Notes")}</Label><Textarea id="payment-notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} disabled={pay.isPending} /></div></div><AlertDialogFooter><AlertDialogCancel disabled={pay.isPending}>{pick("إلغاء", "Cancel")}</AlertDialogCancel><AlertDialogAction disabled={!receipt || pay.isPending} onClick={(event) => { event.preventDefault(); if (!receipt || submitLock.current) return; pay.mutate(); }}>{pay.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{pick("تأكيد الدفع", "Confirm payment")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></DashboardLayout>;
}

export function AdminTeacherPayrollStatementPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params] = useSearchParams();
  const curriculumId = params.get("curriculumId") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const teacherId = params.get("teacherId") || "";
  const returnQuery = new URLSearchParams({ curriculumId, from, to, teacherSearch: params.get("teacherSearch") || "", create: "1" });
  const { pick } = useLanguage();
  const [courseRates, setCourseRates] = useState<Record<string, string>>({});
  const [gradeRates, setGradeRates] = useState<Record<string, string>>({});
  const [statementCurrency, setStatementCurrency] = useState<PayrollStatementCurrency | "">("");
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const statement = useQuery({
    queryKey: ["admin-payroll-statement", curriculumId, from, to],
    queryFn: () => adminPayrollApi.curriculumStatementPreview(curriculumId, from, to),
    enabled: Boolean(curriculumId && from && to && teacherId),
    retry: 1,
  });
  const teacher = statement.data?.teachers.find((item) => item.teacherId === teacherId);
  const sendStatement = useMutation({
    mutationFn: () => {
      if (!statementCurrency) throw new Error("اختر عملة الكشف أولًا.");
      return adminPayrollApi.createStatement({
        teacherId,
        curriculumId,
        from,
        to,
        currency: statementCurrency,
        generalAmount: teacher?.payroll?.generalAmount || 0,
        bonuses: teacher?.payroll?.bonus || 0,
        deductions: teacher?.payroll?.deduction || 0,
        gradeRates: teacher?.general.gradeGroups?.map((group) => ({ gradeId: group.gradeId, hourlyRate: Number(gradeRates[group.gradeId] ?? group.hourlyRate ?? 0) })) || [],
        courseRates: teacher?.courses.map((course) => ({ courseId: course.courseId, hourlyRate: Number(courseRates[course.courseId] || 0) })) || [],
      });
    },
    onSuccess: async () => { setSendConfirmOpen(false); await client.invalidateQueries({ queryKey: ["admin-payroll-statements"] }); toast.success("تم حفظ مسودة الكشف."); navigate("/admin/payroll?view=sent"); },
    onError: (error) => toast.error(courseError(error)),
  });

  return <DashboardLayout><div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">كشف مستحقات المعلم</h1><p className="mt-1 text-sm text-muted-foreground">تفاصيل كشف المعلم للفترة والمنهج المحددين.</p></div><Button asChild variant="outline"><Link to={`/admin/payroll?${returnQuery}`}><ArrowRight className="me-2 h-4 w-4" />{pick("العودة", "Back")}</Link></Button></header>
    {statement.isLoading ? <Skeleton className="h-96" /> : statement.isError ? <Card><CardContent className="p-8 text-center"><p className="text-destructive">تعذر تحميل كشف المعلم.</p><Button className="mt-3" variant="outline" onClick={() => void statement.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card> : !teacher || !statement.data ? <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد كشف لهذا المعلم.</CardContent></Card> : <TeacherPayrollStatement statement={teacher} curriculumName={statement.data.curriculum.name} period={statement.data.period} currency={statementCurrency} onCurrencyChange={setStatementCurrency} onRatesChange={setCourseRates} onGradeRatesChange={setGradeRates} onSend={() => setSendConfirmOpen(true)} sending={sendStatement.isPending} sendDisabled={!statementCurrency} actionLabel="حفظ المسودة" />}
    <AlertDialog open={sendConfirmOpen} onOpenChange={(open) => { if (!sendStatement.isPending) setSendConfirmOpen(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>تأكيد حفظ المسودة</AlertDialogTitle><AlertDialogDescription>سيتم حفظ الكشف كمسودة، ويمكنك تعديله قبل إرساله للمعلم.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={sendStatement.isPending}>إلغاء</AlertDialogCancel><AlertDialogAction disabled={sendStatement.isPending} onClick={(event) => { event.preventDefault(); sendStatement.mutate(); }}>{sendStatement.isPending ? "جارٍ الحفظ..." : "حفظ المسودة"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></DashboardLayout>;
}

const WorkItems = ({ payroll }: { payroll: AdminPayroll }) => <Card><CardHeader><CardTitle>تفاصيل العمل</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{payroll.workItems.map((item) => <div key={item.gradeId || item.curriculumId} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{item.curriculumName} — {item.gradeName}</p><p>{item.sessionsCount} جلسة</p>{item.displayDuration && <p>{item.displayDuration}</p>}<p>{item.rate} × {item.rateType}</p><p className="font-bold">{item.amount} {payroll.currency}</p></div>)}</CardContent></Card>;
const Totals = ({ payroll }: { payroll: AdminPayroll }) => <Card><CardHeader><CardTitle>الإجماليات</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>المجموع الفرعي: {payroll.totals.subtotal} {payroll.currency}</p><p>المكافأة: {payroll.totals.bonus} {payroll.currency}</p><p>الخصم: {payroll.totals.deduction} {payroll.currency}</p><p className="border-t pt-2 text-lg font-bold">الإجمالي: {payroll.totals.total} {payroll.currency}</p>{payroll.adjustmentNote && <p className="break-words text-muted-foreground">{payroll.adjustmentNote}</p>}{payroll.notes && <p className="break-words text-muted-foreground">{payroll.notes}</p>}</CardContent></Card>;
