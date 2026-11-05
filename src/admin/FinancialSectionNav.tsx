import { CreditCard, ReceiptText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const sections = [
  { path: "/admin/subscriptions", title: "اشتراكات الطلاب", description: "الخدمة المفعلة، المواد، الساعات والصلاحية", icon: CreditCard },
  { path: "/admin/payments", title: "عمليات الدفع", description: "المبلغ، مزود الدفع وحالة المعاملة المالية", icon: ReceiptText },
];

export default function FinancialSectionNav() {
  const { pathname } = useLocation();
  return <nav aria-label="التنقل المالي" className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2">{sections.map(({ path, title, description, icon: Icon }) => {
    const active = pathname.startsWith(path);
    return <Link key={path} to={path} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/50"}`}><Icon className="h-5 w-5 shrink-0"/><span><span className="block font-bold">{title}</span><span className={`block text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{description}</span></span></Link>;
  })}</nav>;
}
