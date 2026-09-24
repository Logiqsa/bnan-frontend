import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminParent } from "@/api/adminParentsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { dateLabel, display, entityName } from "@/admin/adminFinancialUi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور" };

export default function AdminParentDetails() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const query = useQuery({ queryKey: ["admin-parent", id], queryFn: () => getAdminParent(id), enabled: Boolean(id), retry: false });
  const parent = query.data;
  const field = (label: string, value: unknown) => <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{display(value)}</p></div>;
  const error = query.error instanceof ApiError && query.error.status === 404 ? "ولي الأمر غير موجود." : "تعذر تحميل بيانات ولي الأمر.";
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-5" dir="rtl"><Button variant="ghost" onClick={() => navigate("/admin/parents")}><ArrowLeft className="ml-1 h-4 w-4" />العودة لأولياء الأمور</Button><Card><CardHeader><CardTitle>تفاصيل ولي الأمر</CardTitle></CardHeader><CardContent>{query.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 py-10 text-center"><p>{error}</p>{query.error instanceof ApiError && query.error.status !== 404 && <Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>}</div> : parent ? <div className="space-y-5"><section><h2 className="mb-3 text-lg font-semibold">بيانات ولي الأمر</h2><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(parent.user))}{field("البريد الإلكتروني", parent.user?.email)}{field("الهاتف", parent.phone)}{field("واتساب", parent.whatsappNumber)}{field("الحالة", statusLabels[parent.user?.status || ""] || parent.user?.status)}{field("حالة التحقق", parent.user?.isVerified === null || parent.user?.isVerified === undefined ? undefined : parent.user.isVerified ? "تم التحقق" : "غير متحقق")}{field("تاريخ الإنشاء", dateLabel(parent.createdAt))}</div></section><section><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">الطلاب المرتبطون</h2>{parent.children?.length ? <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{parent.children.length} طلاب</span> : null}</div>{parent.children?.length ? <div className="space-y-4">{parent.children.map((child, index) => <div key={child.id} className="rounded-xl border-2 border-primary/10 bg-muted/10 p-4 shadow-sm"><div className="mb-4 flex items-center gap-2 border-b border-primary/10 pb-3"><span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">الطالب {index + 1}</span><span className="font-semibold">{entityName(child.user)}</span></div><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(child.user))}{field("البريد الإلكتروني", child.user?.email)}{field("الحالة", statusLabels[child.user?.status || ""] || child.user?.status)}{field("المنهج", entityName(child.curriculum))}{field("الصف", entityName(child.grade))}{field("نوع التسجيل", child.registrationType)}{field("حالة التسجيل", child.registrationStatus)}</div></div>)}</div> : <p className="rounded-lg border p-6 text-center text-muted-foreground">لا يوجد طلاب مرتبطون.</p>}</section></div> : <p className="py-10 text-center">ولي الأمر غير موجود.</p>}</CardContent></Card></div></DashboardLayout>;
}
