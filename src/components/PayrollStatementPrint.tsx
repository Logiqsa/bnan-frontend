import { createPortal } from "react-dom";
import academyLogo from "@/assets/logo-bnan.png";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import PayrollStatementBreakdown from "@/components/PayrollStatementBreakdown";
import { formatPayrollStatementMoney, payrollStatementCurrencyName, payrollStatementCurrencySymbol } from "@/lib/payrollStatementCurrency";

const money = (value: number, currency: string) => formatPayrollStatementMoney(value, currency);
const dateOnly = (value: string) => {
  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = new Date(datePart ? `${datePart}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const PRINT_STYLES = `
  @media screen { .statement-print-portal { display: none; } }
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body > *:not(.statement-print-portal) { display: none !important; }
    .statement-print-portal { display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; direction: rtl; color: #0f172a; background: #fff !important; }
    .statement-print-portal, .statement-print-portal * { box-sizing: border-box; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
    .statement-print-header { display: grid; grid-template-columns: auto 1fr; gap: 4mm 7mm; align-items: center; border-radius: 0 0 6mm 6mm; padding: 7mm 9mm; background: #0b1b40 !important; color: #fff !important; }
    .statement-print-header img { width: 22mm; height: 18mm; object-fit: contain; filter: brightness(0) invert(1); }
    .statement-print-header h1 { margin: 0; font-size: 20pt; line-height: 1.2; color: #fff !important; }
    .statement-print-header p { margin: 2mm 0 0; font-size: 11pt; color: #fff !important; }
    .statement-print-header dl { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 1mm 0 0; padding-top: 4mm; border-top: 1px solid rgba(255,255,255,.35); }
    .statement-print-header dl div { display: flex; gap: 2mm; align-items: baseline; }
    .statement-print-header dt { font-size: 8pt; color: #cbd5e1; }
    .statement-print-header dd { margin: 0; font-size: 10pt; font-weight: 700; color: #fff; }
    .statement-print-body { width: 100%; padding-top: 7mm; }
    .statement-print .payroll-breakdown { gap: 6mm !important; }
    .statement-print .payroll-breakdown > section { break-inside: auto !important; page-break-inside: auto !important; }
    .statement-print .payroll-breakdown section > h2 { break-after: avoid; page-break-after: avoid; margin: 0 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid #0b1b40; color: #0b1b40; font-size: 15pt; }
    .statement-print .payroll-section { break-inside: auto !important; page-break-inside: auto !important; margin-bottom: 4mm; padding: 4mm !important; border-color: #cbd5e1 !important; border-radius: 3mm !important; }
    .statement-print .payroll-section-heading { break-after: avoid; page-break-after: avoid; }
    .statement-print .payroll-section h3 { color: #0b1b40; font-size: 11pt; }
    .statement-print .payroll-section-heading p { font-size: 9.5pt; }
    .statement-print .payroll-session-table { break-inside: auto !important; page-break-inside: auto !important; overflow: visible !important; border-color: #cbd5e1 !important; border-radius: 2mm !important; }
    .statement-print .payroll-session-table table { width: 100% !important; min-width: 0 !important; table-layout: fixed; border-collapse: collapse; }
    .statement-print .payroll-session-table thead { display: table-header-group; }
    .statement-print .payroll-session-table tbody { display: table-row-group; }
    .statement-print .payroll-session-table th, .statement-print .payroll-session-table td { border: 1px solid #cbd5e1 !important; padding: 2.5mm 2mm !important; font-size: 9pt; }
    .statement-print .payroll-session-table th { background: #0b1b40 !important; color: #fff !important; }
    .statement-print .payroll-session-row { break-inside: avoid !important; page-break-inside: avoid !important; }
    .statement-print .payroll-section-total { break-inside: avoid; break-before: avoid; page-break-inside: avoid; page-break-before: avoid; display: block; width: fit-content; margin: 3mm 0 0 auto; border-radius: 999px; background: #0b1b40 !important; color: #fff !important; padding: 2mm 4mm; font-size: 9.5pt; }
    .statement-print-summary { break-inside: avoid; page-break-inside: avoid; margin-top: 7mm; padding-top: 4mm; border-top: 2px solid #0b1b40; }
    .statement-print-summary h2 { margin: 0 0 3mm; color: #0b1b40; font-size: 15pt; }
    .statement-print-summary p { display: flex; justify-content: space-between; margin: 0; padding: 2mm 0; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
    .statement-print-summary strong { font-weight: 700; }
    .statement-print-summary .statement-print-net { margin-top: 4mm; padding: 4mm 5mm; border: 0; border-radius: 3mm; background: #0b1b40 !important; color: #fff !important; font-size: 13pt; }
  }
`;

export default function PayrollStatementPrint({ statement }: { statement: TeacherPayrollStatement }) {
  const courseTotal = statement.courses.reduce((sum, course) => sum + Number(course.amount || 0), 0);
  const teacherName = statement.teacher.fullName || statement.teacher.email || "—";

  return <>
    <style>{PRINT_STYLES}</style>
    {createPortal(<div className="statement-print statement-print-portal" data-testid="statement-print" dir="rtl">
      <header className="statement-print-header">
        <img src={academyLogo} alt="أكاديمية بنان" />
        <div><h1>التقرير المالي</h1><p>كشف مستحقات المعلم</p></div>
        <dl>
          <div><dt>المعلم</dt><dd>{teacherName}</dd></div>
          <div><dt>الفترة</dt><dd>{dateOnly(statement.period.from)} → {dateOnly(statement.period.to)}</dd></div>
          <div><dt>المنهج</dt><dd>{statement.curriculum.name || "—"}</dd></div>
          <div><dt>العملة</dt><dd>{payrollStatementCurrencyName(statement.currency)} ({payrollStatementCurrencySymbol(statement.currency)})</dd></div>
        </dl>
      </header>
      <main className="statement-print-body">
        <PayrollStatementBreakdown general={statement.generalSubscription} courses={statement.courses} currency={statement.currency} />
        <section className="statement-print-summary" aria-label="الملخص المالي">
          <h2>الملخص المالي</h2>
          <p><span>إجمالي التعليم الأكاديمي</span><strong>{money(statement.generalSubscription.amount, statement.currency)}</strong></p>
          <p><span>إجمالي الدورات</span><strong>{money(courseTotal, statement.currency)}</strong></p>
          <p><span>المكافآت</span><strong>{money(statement.bonuses, statement.currency)}</strong></p>
          <p><span>الخصومات</span><strong>{money(statement.deductions, statement.currency)}</strong></p>
          <p className="statement-print-net"><span>الإجمالي</span><strong>{money(statement.finalAmount, statement.currency)}</strong></p>
        </section>
      </main>
    </div>, document.body)}
  </>;
}
