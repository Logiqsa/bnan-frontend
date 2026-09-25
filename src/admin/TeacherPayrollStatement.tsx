import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import academyLogo from "@/assets/logo-bnan.png";
import type { PayrollStatementTeacher } from "@/api/adminPayrollApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PayrollStatementBreakdown from "@/components/PayrollStatementBreakdown";
import { formatPayrollStatementMoney, PAYROLL_STATEMENT_CURRENCIES, payrollStatementCurrencyName, payrollStatementCurrencySymbol, type PayrollStatementCurrency } from "@/lib/payrollStatementCurrency";

const money = (value: number, currency: string) => formatPayrollStatementMoney(value, currency);
const sessionAmount = (session: NonNullable<PayrollStatementTeacher["courses"][number]["sessions"]>[number], rate: number) => session.durationHours == null ? null : Math.round((session.durationHours * rate + Number.EPSILON) * 100) / 100;
const dateOnly = (value: string) => {
  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = new Date(datePart ? `${datePart}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};
const printStatement = () => {
  const previousTitle = document.title;
  const restoreTitle = () => { document.title = previousTitle; };
  document.title = " ";
  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
};

function PrintableTeacherPayrollStatement({ statement, curriculumName, period, currency, courses, courseTotal, generalTotal, bonus, deduction, finalTotal }: { statement: PayrollStatementTeacher; curriculumName: string; period: { from: string; to: string }; currency: string; courses: Array<{ course: string; courseName: string; hours: number; hourlyRate: number; amount: number; sessions?: NonNullable<PayrollStatementTeacher["courses"][number]["sessions"]> }>; courseTotal: number; generalTotal: number; bonus: number; deduction: number; finalTotal: number }) {
  return <div className="statement-print statement-print-portal" data-testid="statement-print" dir="rtl">
    <header className="statement-print-header">
      <img src={academyLogo} alt="أكاديمية بنان" />
      <div>
        <h1>التقرير المالي</h1>
        <p>كشف مستحقات المعلم</p>
      </div>
      <dl>
        <div><dt>المعلم</dt><dd>{statement.fullName || statement.email || "—"}</dd></div>
        <div><dt>الفترة</dt><dd>{dateOnly(period.from)} → {dateOnly(period.to)}</dd></div>
        <div><dt>المنهج</dt><dd>{curriculumName || "—"}</dd></div>
        <div><dt>العملة</dt><dd>{payrollStatementCurrencyName(currency)} ({payrollStatementCurrencySymbol(currency)})</dd></div>
      </dl>
    </header>
    <main className="statement-print-body">
      <PayrollStatementBreakdown general={{ hours: statement.general.minutes / 60, amount: generalTotal, gradeGroups: statement.general.gradeGroups, sessions: statement.general.sessions }} courses={courses} currency={currency} />
      <section className="statement-print-summary" aria-label="الملخص المالي">
        <h2>الملخص المالي</h2>
        <p><span>إجمالي التعليم الأكاديمي</span><strong>{money(generalTotal, currency)}</strong></p>
        <p><span>إجمالي الدورات</span><strong>{money(courseTotal, currency)}</strong></p>
        <p><span>المكافآت</span><strong>{money(bonus, currency)}</strong></p>
        <p><span>الخصومات</span><strong>{money(deduction, currency)}</strong></p>
        <p className="statement-print-net"><span>الإجمالي</span><strong>{money(finalTotal, currency)}</strong></p>
      </section>
    </main>
  </div>;
}

export default function TeacherPayrollStatement({ statement, curriculumName, period, currency: selectedCurrency, onCurrencyChange, onSend, sending = false, sendDisabled = false, onRatesChange, onGradeRatesChange, initialCourseRates = {}, initialGradeRates = {}, actionLabel = "إرسال للمعلم" }: { statement: PayrollStatementTeacher; curriculumName: string; period: { from: string; to: string }; currency?: PayrollStatementCurrency | ""; onCurrencyChange?: (currency: PayrollStatementCurrency | "") => void; onSend?: () => void; sending?: boolean; sendDisabled?: boolean; onRatesChange?: (rates: Record<string, string>) => void; onGradeRatesChange?: (rates: Record<string, string>) => void; initialCourseRates?: Record<string, string>; initialGradeRates?: Record<string, string>; actionLabel?: string }) {
  const [rates, setRates] = useState<Record<string, string>>(initialCourseRates);
  const [gradeRates, setGradeRates] = useState<Record<string, string>>(initialGradeRates);
  useEffect(() => { onRatesChange?.(rates); }, [onRatesChange, rates]);
  useEffect(() => { onGradeRatesChange?.(gradeRates); }, [gradeRates, onGradeRatesChange]);
  const currency = selectedCurrency || statement.payroll?.currency || "EGP";
  const currencySelected = !onCurrencyChange || Boolean(selectedCurrency);
  const courseTotal = useMemo(() => statement.courses.reduce((total, course) => { const rate = Number(rates[course.courseId]) || 0; const sessions = course.sessions?.map((session) => sessionAmount(session, rate)).filter((amount): amount is number => amount !== null) || []; return total + (sessions.length ? sessions.reduce((sum, amount) => sum + amount, 0) : (course.minutes / 60) * rate); }, 0), [rates, statement.courses]);
  const pricedGradeGroups = useMemo(() => (statement.general.gradeGroups || []).map((group) => {
    const rate = Number(gradeRates[group.gradeId] ?? group.hourlyRate ?? 0);
    const sessions = group.sessions.map((session) => ({ ...session, hourlyRate: rate, amount: sessionAmount(session, rate) }));
    const amounts = sessions.map((session) => session.amount).filter((amount): amount is number => amount !== null);
    return { ...group, hourlyRate: rate, sessions, totalAmount: amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : group.totalHours * rate };
  }), [gradeRates, statement.general.gradeGroups]);
  const generalTotal = pricedGradeGroups.length ? pricedGradeGroups.reduce((sum, group) => sum + group.totalAmount, 0) : statement.payroll?.generalAmount || 0;
  const bonus = statement.payroll?.bonus || 0;
  const deduction = statement.payroll?.deduction || 0;
  const finalTotal = generalTotal + courseTotal + bonus - deduction;
  const printCourses = statement.courses.map((course) => { const rate = Number(rates[course.courseId]) || 0; const sessions = course.sessions?.map((session) => ({ ...session, hourlyRate: rate, amount: sessionAmount(session, rate) })); const amounts = sessions?.map((session) => session.amount).filter((amount): amount is number => amount !== null) || []; return { course: course.courseId, courseName: course.courseName, hours: course.minutes / 60, hourlyRate: rate, amount: amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : (course.minutes / 60) * rate, sessions }; });

  return <div className="teacher-payroll-statement-root" dir="rtl">
    <style>{`@media screen { .statement-print-portal { display: none; } } @media print { @page { size: A4 portrait; margin: 10mm; } html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; } body > *:not(.statement-print-portal) { display: none !important; } .statement-print-portal { display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; direction: rtl; color: #0f172a; background: #fff !important; } .statement-print-portal, .statement-print-portal * { box-sizing: border-box; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } .statement-print-header { display: grid; grid-template-columns: auto 1fr; gap: 4mm 7mm; align-items: center; border-radius: 0 0 6mm 6mm; padding: 7mm 9mm; background: #0b1b40 !important; color: #fff !important; } .statement-print-header img { width: 22mm; height: 18mm; object-fit: contain; filter: brightness(0) invert(1); } .statement-print-header h1 { margin: 0; font-size: 20pt; line-height: 1.2; color: #fff !important; } .statement-print-header p { margin: 2mm 0 0; font-size: 11pt; color: #fff !important; } .statement-print-header dl { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 1mm 0 0; padding-top: 4mm; border-top: 1px solid rgba(255,255,255,.35); } .statement-print-header dl div { display: flex; gap: 2mm; align-items: baseline; } .statement-print-header dt { font-size: 8pt; color: #cbd5e1; } .statement-print-header dd { margin: 0; font-size: 10pt; font-weight: 700; color: #fff; } .statement-print-body { width: 100%; padding-top: 7mm; } .statement-print .payroll-breakdown { gap: 6mm !important; } .statement-print .payroll-breakdown > section { break-inside: auto !important; page-break-inside: auto !important; } .statement-print .payroll-breakdown section > h2 { break-after: avoid; page-break-after: avoid; margin: 0 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid #0b1b40; color: #0b1b40; font-size: 15pt; } .statement-print .payroll-section { break-inside: auto !important; page-break-inside: auto !important; margin-bottom: 4mm; padding: 4mm !important; border-color: #cbd5e1 !important; border-radius: 3mm !important; } .statement-print .payroll-section-heading { break-after: avoid; page-break-after: avoid; } .statement-print .payroll-section h3 { color: #0b1b40; font-size: 11pt; } .statement-print .payroll-section-heading p { font-size: 9.5pt; } .statement-print .payroll-session-table { break-inside: auto !important; page-break-inside: auto !important; overflow: visible !important; border-color: #cbd5e1 !important; border-radius: 2mm !important; } .statement-print .payroll-session-table table { width: 100% !important; min-width: 0 !important; table-layout: fixed; border-collapse: collapse; } .statement-print .payroll-session-table thead { display: table-header-group; } .statement-print .payroll-session-table tbody { display: table-row-group; } .statement-print .payroll-session-table th, .statement-print .payroll-session-table td { border: 1px solid #cbd5e1 !important; padding: 2.5mm 2mm !important; font-size: 9pt; } .statement-print .payroll-session-table th { background: #0b1b40 !important; color: #fff !important; } .statement-print .payroll-session-row { break-inside: avoid !important; page-break-inside: avoid !important; } .statement-print .payroll-section-total { break-inside: avoid; break-before: avoid; page-break-inside: avoid; page-break-before: avoid; display: block; width: fit-content; margin: 3mm 0 0 auto; border-radius: 999px; background: #0b1b40 !important; color: #fff !important; padding: 2mm 4mm; font-size: 9.5pt; } .statement-print-summary { break-inside: avoid; page-break-inside: avoid; margin-top: 7mm; padding-top: 4mm; border-top: 2px solid #0b1b40; } .statement-print-summary h2 { margin: 0 0 3mm; color: #0b1b40; font-size: 15pt; } .statement-print-summary p { display: flex; justify-content: space-between; margin: 0; padding: 2mm 0; border-bottom: 1px solid #e2e8f0; font-size: 10pt; } .statement-print-summary strong { font-weight: 700; } .statement-print-summary .statement-print-net { margin-top: 4mm; padding: 4mm 5mm; border: 0; border-radius: 3mm; background: #0b1b40 !important; color: #fff !important; font-size: 13pt; } }`}</style>
    <div className="statement-screen" data-testid="statement-screen">
      <Card id="teacher-payroll-statement" className="teacher-payroll-report overflow-hidden border-slate-200 shadow-sm" dir="rtl">
        <CardHeader className="payroll-print-header flex flex-col gap-3 bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><img src={academyLogo} alt="أكاديمية بنان" className="h-12 w-auto object-contain" /><div><CardTitle className="text-xl">التقرير المالي — كشف مستحقات المعلم</CardTitle><p className="mt-1 text-sm font-medium text-foreground">المعلم: {statement.fullName || statement.email || "—"}</p><p className="text-xs text-muted-foreground">{curriculumName} · الفترة: {dateOnly(period.from)} → {dateOnly(period.to)}{currencySelected ? ` · العملة: ${payrollStatementCurrencyName(currency)} (${payrollStatementCurrencySymbol(currency)})` : ""}</p></div></div><div className="teacher-payroll-print-hidden flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" onClick={printStatement} disabled={!currencySelected}> <Printer className="ms-2 h-4 w-4" />طباعة الكشف</Button>{onSend && <Button onClick={onSend} disabled={sending || sendDisabled || !currencySelected}>{sending ? "جارٍ الحفظ..." : actionLabel}</Button>}</div></CardHeader>
        <CardContent className="payroll-print-content space-y-5">
      {!!statement.general.gradeGroups?.length && <section className="rounded-xl border bg-muted/10 p-4"><h3 className="mb-3 text-lg font-semibold">أسعار ساعات التعليم الأكاديمي</h3><div className="grid gap-3 sm:grid-cols-2">{statement.general.gradeGroups.map((group) => <div key={group.gradeId}><label className="mb-1 block text-sm" htmlFor={`grade-rate-${group.gradeId}`}>{group.gradeName}</label><div className="flex items-center gap-2"><Input id={`grade-rate-${group.gradeId}`} type="number" min="0" step="0.01" aria-label={`سعر ساعة ${group.gradeName}`} value={gradeRates[group.gradeId] ?? String(group.hourlyRate ?? "")} onChange={(event) => setGradeRates((current) => ({ ...current, [group.gradeId]: event.target.value }))} /><span className="grid h-9 w-24 shrink-0 place-items-center rounded-md border bg-background text-sm font-medium">{currencySelected ? payrollStatementCurrencySymbol(currency) : "—"}</span></div></div>)}</div></section>}
      <section className="rounded-xl border bg-muted/10 p-4"><h3 className="mb-3 text-lg font-semibold">أسعار ساعات الدورات</h3><div className="grid gap-3 sm:grid-cols-2">{statement.courses.map((course, index) => <div key={course.courseId}><label className="mb-1 block text-sm" htmlFor={`course-rate-${course.courseId}`}>{course.courseName}</label><div className="flex items-center gap-2"><Input id={`course-rate-${course.courseId}`} className="h-9 min-w-0 flex-1" type="number" min="0" step="0.01" aria-label={`سعر ساعة ${course.courseName}`} value={rates[course.courseId] || ""} onChange={(event) => setRates((current) => ({ ...current, [course.courseId]: event.target.value }))} />{onCurrencyChange ? <select aria-label={index === 0 ? "العملة" : `عملة سعر ${course.courseName}`} required value={selectedCurrency || ""} onChange={(event) => onCurrencyChange(event.target.value as PayrollStatementCurrency | "")} className="h-9 w-32 shrink-0 rounded-md border border-input bg-background px-2 text-sm"><option value="">العملة</option>{PAYROLL_STATEMENT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code === "SAR" ? "ريال (ر.س)" : "جنيه (EGP)"}</option>)}</select> : <span className="grid h-9 w-24 shrink-0 place-items-center rounded-md border bg-background text-sm font-medium">{payrollStatementCurrencySymbol(currency)}</span>}</div></div>)}{!statement.courses.length && onCurrencyChange && <div className="sm:max-w-xs"><label className="mb-1 block text-sm" htmlFor="statement-currency">العملة</label><select id="statement-currency" aria-label="العملة" required value={selectedCurrency || ""} onChange={(event) => onCurrencyChange(event.target.value as PayrollStatementCurrency | "")} className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"><option value="">العملة</option>{PAYROLL_STATEMENT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code === "SAR" ? "ريال (ر.س)" : "جنيه (EGP)"}</option>)}</select></div>}</div>{onCurrencyChange && <p className="mt-2 text-xs text-muted-foreground">العملة موحدة للكشف كله، وتُحفظ مع المسودة.</p>}</section>
      {currencySelected ? <><PayrollStatementBreakdown general={{ hours: statement.general.minutes / 60, amount: generalTotal, gradeGroups: pricedGradeGroups, sessions: pricedGradeGroups.length ? pricedGradeGroups.flatMap((group) => group.sessions) : statement.general.sessions }} courses={printCourses} currency={currency} />
      <div className="payroll-summary grid gap-3 sm:grid-cols-4"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">إجمالي التعليم الأكاديمي</p><strong>{money(generalTotal, currency)}</strong></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">إجمالي الدورات</p><strong>{money(courseTotal, currency)}</strong></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">المكافآت / الخصومات</p><strong>{money(bonus - deduction, currency)}</strong><Badge className="mt-1 block w-fit" variant="outline">{money(bonus, currency)} / {money(deduction, currency)}</Badge></div><div className="payroll-final-total rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">الإجمالي</p><strong>{money(finalTotal, currency)}</strong></div></div></> : <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">اختر العملة بجوار إدخال السعر لعرض الكشف وحفظ المسودة.</p>}
        </CardContent>
      </Card>
    </div>
    {currencySelected && createPortal(<PrintableTeacherPayrollStatement statement={{ ...statement, general: { ...statement.general, gradeGroups: pricedGradeGroups, sessions: pricedGradeGroups.length ? pricedGradeGroups.flatMap((group) => group.sessions) : statement.general.sessions } }} curriculumName={curriculumName} period={period} currency={currency} courses={printCourses} courseTotal={courseTotal} generalTotal={generalTotal} bonus={bonus} deduction={deduction} finalTotal={finalTotal} />, document.body)}
  </div>;
}
