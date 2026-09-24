export const financialStatusLabels: Record<string, string> = { active: "نشط", grace_period: "فترة سماح", suspended: "موقوف", expired: "منتهي", cancelled: "ملغي", pending: "قيد الانتظار", authorized: "مصرح به", captured: "تم التحصيل", completed: "مكتمل", failed: "فشل", rejected: "مرفوض", cancelled_payment: "ملغي", expired_payment: "منتهي" };
export const purposeLabels: Record<string, string> = { registration: "تسجيل", renewal: "تجديد", subject_request: "طلب مادة", course_enrollment: "تسجيل دورة" };
export const providerLabels: Record<string, string> = { egyptian: "مصري", tamara: "تمارا", paymob: "باي موب" };
export const modelLabels: Record<string, string> = { EgyptianPayment: "دفع مصري", Payment: "دفع خليجي" };
export const display = (value: unknown) => value === undefined || value === null || value === "" ? "غير متاح" : String(value);
export const entityName = (value: unknown) => {
  if (!value || typeof value !== "object") return display(value);
  const item = value as Record<string, unknown>;
  return display(item.name || item.fullName || (item.user && typeof item.user === "object" ? (item.user as Record<string, unknown>).fullName : undefined));
};
export const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "غير متاح";
export const moneyLabel = (amount?: number | null, currency?: string | null) => amount === undefined || amount === null ? "غير متاح" : `${amount.toLocaleString("ar-SA")}${currency ? ` ${currency}` : ""}`;
