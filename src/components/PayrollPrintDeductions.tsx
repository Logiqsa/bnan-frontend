import { formatPayrollStatementMoney } from "@/lib/payrollStatementCurrency";

export interface PayrollPrintDeductionItem {
  key: string;
  type: string;
  detail: string;
  curriculum?: string | null;
  occurredAt?: string | null;
  minutesLate?: number | null;
  amount: number;
}

const date = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
        dateStyle: "medium",
      }).format(parsed);
};

export default function PayrollPrintDeductions({
  items,
  currency,
}: {
  items: PayrollPrintDeductionItem[];
  currency: string;
}) {
  return (
    <section className="statement-print-deductions" aria-label="تفاصيل الخصومات">
      <h2>تفاصيل الخصومات</h2>
      {items.length ? (
        <table>
          <thead>
            <tr>
              <th>النوع</th>
              <th>التفاصيل</th>
              <th>المنهج</th>
              <th>التاريخ / التأخير</th>
              <th>القيمة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td>{item.type}</td>
                <td>{item.detail || "—"}</td>
                <td>{item.curriculum || "—"}</td>
                <td>
                  {item.occurredAt ? date(item.occurredAt) : "—"}
                  {item.minutesLate != null
                    ? ` — ${item.minutesLate} دقيقة تأخير`
                    : ""}
                </td>
                <td dir="ltr">
                  {formatPayrollStatementMoney(item.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="statement-print-deductions-empty">
          لا توجد خصومات على هذا الكشف.
        </p>
      )}
    </section>
  );
}
