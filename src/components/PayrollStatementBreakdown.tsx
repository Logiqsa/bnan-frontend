import type { AcademicGradeGroup, StatementSession } from "@/api/teacherPayrollStatementsApi";
import { formatPayrollStatementMoney } from "@/lib/payrollStatementCurrency";

const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("ar-EG-u-ca-gregory", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
const money = (value: number | null | undefined, currency: string) => value == null ? "—" : formatPayrollStatementMoney(value, currency);
const duration = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  const minutes = Math.max(0, Math.round(value * 60));
  if (value > 0 && minutes === 0) return `${value.toLocaleString("en-US", { maximumFractionDigits: 5 })} ساعة`;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

const SessionTable = ({ sessions, currency }: { sessions: StatementSession[]; currency: string }) => <div className="payroll-session-table overflow-x-auto rounded-lg border"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b bg-slate-900 text-white"><th className="p-3 text-right">تاريخ الحصة</th><th className="p-3 text-right">مدة الحصة</th><th className="p-3 text-right">سعر الساعة</th><th className="p-3 text-right">قيمة الحصة</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.sessionId} className="payroll-session-row border-b last:border-0"><td className="p-3 whitespace-nowrap">{date(session.date)}</td><td className="p-3 whitespace-nowrap">{duration(session.durationHours)}</td><td className="p-3 whitespace-nowrap">{money(session.hourlyRate, currency)}</td><td className="p-3 whitespace-nowrap">{money(session.amount, currency)}</td></tr>)}{!sessions.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">لا توجد جلسات محفوظة في هذا الكشف.</td></tr>}</tbody></table></div>;

export default function PayrollStatementBreakdown({ general, courses, currency }: { general: { hours: number; amount: number; gradeGroups?: AcademicGradeGroup[]; sessions?: StatementSession[] }; courses: Array<{ course: string; courseName: string; hours: number; hourlyRate: number; amount: number; sessions?: StatementSession[] }>; currency: string }) {
  const groups = general.gradeGroups || [];
  const hasAcademicDetails = groups.length > 0 || Boolean(general.sessions?.length);
  return <div className="payroll-breakdown space-y-6 print:space-y-4">
    <section><h2 className="mb-3 text-xl font-bold">التعليم الأكاديمي</h2>{groups.length ? <div className="space-y-4">{groups.map((group) => <div key={group.gradeId} className="payroll-section rounded-xl border p-4"><div className="payroll-section-heading mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">الصف: {group.gradeName || "—"}</h3><p>سعر الساعة: <strong>{money(group.hourlyRate, currency)}</strong></p></div><SessionTable sessions={group.sessions} currency={currency} /><p className="payroll-section-total mt-3 font-semibold">إجمالي حصص الصف: {money(group.totalAmount, currency)}</p></div>)}</div> : hasAcademicDetails ? <SessionTable sessions={general.sessions || []} currency={currency} /> : <div className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد تفاصيل جلسات محفوظة؛ إجمالي التعليم الأكاديمي: {money(general.amount, currency)}</div>}</section>
    <section><h2 className="mb-3 text-xl font-bold">الدورات</h2>{courses.length ? <div className="space-y-4">{courses.map((course) => <div key={course.course} className="payroll-section rounded-xl border p-4"><div className="payroll-section-heading mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">الدورة: {course.courseName}</h3><p>سعر الساعة: <strong>{money(course.hourlyRate, currency)}</strong></p></div>{course.sessions?.length ? <SessionTable sessions={course.sessions} currency={currency} /> : <div className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد تفاصيل جلسات محفوظة لهذه الدورة.</div>}<p className="payroll-section-total mt-3 font-semibold">إجمالي الدورة: {money(course.amount, currency)}</p></div>)}</div> : <div className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد دورات في هذا الكشف.</div>}</section>
  </div>;
}
