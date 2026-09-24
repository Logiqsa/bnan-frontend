import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminStudent } from "@/api/adminStudentsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { dateLabel, display, entityName } from "@/admin/adminFinancialUi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور" };
const registrationStatusLabels: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const registrationTypeLabels: Record<string, string> = { academic: "أكاديمي", course_only: "دورات فقط" };

export default function AdminStudentDetails() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const query = useQuery({ queryKey: ["admin-student", id], queryFn: () => getAdminStudent(id), enabled: Boolean(id), retry: false });
  const student = query.data;
  const field = (label: string, value: unknown) => <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{display(value)}</p></div>;
  const error = query.error instanceof ApiError && query.error.status === 404 ? "الطالب غير موجود." : "تعذر تحميل بيانات الطالب.";
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-5" dir="rtl"><Button variant="ghost" onClick={() => navigate("/admin/students")}><ArrowLeft className="ml-1 h-4 w-4" />العودة للطلاب</Button><Card><CardHeader><CardTitle>تفاصيل الطالب</CardTitle></CardHeader><CardContent>{query.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 py-10 text-center"><p>{error}</p>{query.error instanceof ApiError && query.error.status !== 404 && <Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>}</div> : student ? <div className="space-y-5"><section><h2 className="mb-3 text-lg font-semibold">بيانات الطالب</h2><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(student.user))}{field("البريد الإلكتروني", student.user?.email)}{field("حالة الحساب", statusLabels[student.user?.status || ""] || student.user?.status)}{field("حالة التحقق", student.user?.isVerified === null || student.user?.isVerified === undefined ? undefined : student.user.isVerified ? "تم التحقق" : "غير متحقق")}{field("نوع التسجيل", registrationTypeLabels[student.registrationType || ""] || student.registrationType)}{field("حالة التسجيل", registrationStatusLabels[student.registrationStatus || ""] || student.registrationStatus)}{field("تاريخ الإنشاء", dateLabel(student.createdAt))}</div></section><section><h2 className="mb-3 text-lg font-semibold">البيانات الأكاديمية</h2><div className="grid gap-3 sm:grid-cols-2">{field("المنهج", entityName(student.curriculum))}{field("الصف", entityName(student.grade))}{field("المواد", student.subjects?.map((subject) => subject.name).filter(Boolean).join("، "))}</div></section><section><h2 className="mb-3 text-lg font-semibold">ولي الأمر</h2><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(student.parent?.user))}{field("البريد الإلكتروني", student.parent?.user?.email)}{field("الهاتف", student.parent?.phone)}{field("واتساب", student.parent?.whatsappNumber)}</div></section></div> : <p className="py-10 text-center">الطالب غير موجود.</p>}</CardContent></Card></div></DashboardLayout>;
}
