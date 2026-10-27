import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, ReceiptText } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getAdminStudent, getAdminStudentRegistrations } from "@/api/adminStudentsApi";
import { egyptianRegistrationRequestsApi } from "@/api/egyptianRegistrationRequestsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ApiError } from "@/api/client";
import { dateLabel, display, entityName } from "@/admin/adminFinancialUi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور" };
const registrationStatusLabels: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const registrationTypeLabels: Record<string, string> = { academic: "أكاديمي", course_only: "دورات فقط" };
const studentTypeLabels: Record<string, string> = { academy: "طالب أكاديمية", course_academic: "طالب دورات (أكاديمي)", course_general: "طالب دورات (عام)" };
const courseEnrollmentStatus: Record<string, string> = { pending: "قيد الانتظار", active: "نشط", completed: "مكتمل", cancelled: "ملغي", refunded: "مسترد", expired: "منتهي", removed: "تمت إزالته" };
const classroomEnrollmentStatus: Record<string, string> = { pending: "قيد الانتظار", approved: "معتمد", rejected: "مرفوض", archived: "مؤرشف" };

export default function AdminStudentDetails() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const registrationsOpen = searchParams.get("registrations") === "1";
  const setRegistrationsOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("registrations", "1");
    else next.delete("registrations");
    setSearchParams(next, { replace: true });
  };
  const query = useQuery({ queryKey: ["admin-student", id], queryFn: () => getAdminStudent(id), enabled: Boolean(id), retry: false });
  const registrations = useQuery({ queryKey: ["admin-student-registrations", id], queryFn: () => getAdminStudentRegistrations(id), enabled: registrationsOpen && Boolean(id), retry: false });
  const student = query.data;
  const paymentRegistration = useQuery({
    queryKey: ["admin-student-payment-registration", student?.user?.id],
    queryFn: () => egyptianRegistrationRequestsApi.findByUser({ id: student!.user!.id!, email: student?.user?.email || undefined, fullName: student?.user?.fullName || undefined }),
    enabled: Boolean(student?.user?.id),
    retry: false,
  });
  const registration = paymentRegistration.data;
  const approvePayment = async () => {
    if (!registration || approvalLoading) return;
    const paymentConfirmed = registration.payment?.status === "confirmed";
    const amount = Number(paymentAmount);
    if (!paymentConfirmed && !paymentReceipt) return toast.error("اختر صورة إيصال التحويل أولًا.");
    if (!paymentConfirmed && (!paymentAmount.trim() || !Number.isFinite(amount) || amount <= 0)) return toast.error("أدخل المبلغ المدفوع بشكل صحيح.");
    setApprovalLoading(true);
    try {
      if (!paymentConfirmed) await egyptianRegistrationRequestsApi.confirmPayment(registration.studentId, { receipt: paymentReceipt!, amount });
      await egyptianRegistrationRequestsApi.approve(registration.studentId);
      setPaymentReceipt(null); setPaymentAmount("");
      await Promise.all([query.refetch(), paymentRegistration.refetch(), queryClient.invalidateQueries({ queryKey: ["admin-students"] })]);
      toast.success("تم اعتماد الدفع وتفعيل الطالب بنجاح.");
    } catch (reason) {
      const error = reason as ApiError;
      const messages: Record<string, string> = { PAYMENT_AMOUNT_MISMATCH: "المبلغ المدخل لا يطابق قيمة الاشتراك.", PAYMENT_ALREADY_CONFIRMED: "تم تأكيد هذا الدفع من قبل.", PAYMENT_PROOF_REQUIRED: "صورة إيصال التحويل مطلوبة." };
      toast.error(messages[error.code] || error.message || "تعذر اعتماد الدفع.");
    } finally { setApprovalLoading(false); }
  };
  const field = (label: string, value: unknown) => <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{display(value)}</p></div>;
  const error = query.error instanceof ApiError && query.error.status === 404 ? "الطالب غير موجود." : "تعذر تحميل بيانات الطالب.";
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo || "/admin/students";
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-5" dir="rtl"><Button variant="ghost" onClick={() => navigate(returnTo)}><ArrowLeft className="ml-1 h-4 w-4" />العودة للطلاب</Button><Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle>تفاصيل الطالب</CardTitle><Button variant="outline" onClick={() => setRegistrationsOpen(true)} disabled={!id}>تفاصيل التسجيل</Button></CardHeader><CardContent>{query.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}</div> : query.isError ? <div role="alert" className="grid gap-3 py-10 text-center"><p>{error}</p>{query.error instanceof ApiError && query.error.status !== 404 && <Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>}</div> : student ? <div className="space-y-5"><section><h2 className="mb-3 text-lg font-semibold">بيانات الطالب</h2><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(student.user))}{field("البريد الإلكتروني", student.user?.email)}{field("حالة الحساب", statusLabels[student.user?.status || ""] || student.user?.status)}{field("حالة التحقق", student.user?.isVerified === null || student.user?.isVerified === undefined ? undefined : student.user.isVerified ? "تم التحقق" : "غير متحقق")}{field("نوع التسجيل", studentTypeLabels[student.studentType || ""] || registrationTypeLabels[student.registrationType || ""] || student.registrationType)}{field("حالة التسجيل", registrationStatusLabels[student.registrationStatus || ""] || student.registrationStatus)}{field("تاريخ الإنشاء", dateLabel(student.createdAt))}</div></section><section><h2 className="mb-3 text-lg font-semibold">البيانات الأكاديمية</h2><div className="grid gap-3 sm:grid-cols-2">{field("المنهج", entityName(student.curriculum))}{field("الصف", entityName(student.grade))}{field("المواد", student.subjects?.map((subject) => subject.name).filter(Boolean).join("، "))}</div></section><section><h2 className="mb-3 text-lg font-semibold">ولي الأمر</h2><div className="grid gap-3 sm:grid-cols-2">{field("الاسم", entityName(student.parent?.user))}{field("البريد الإلكتروني", student.parent?.user?.email)}{field("الهاتف", student.parent?.phone)}{field("واتساب", student.parent?.whatsappNumber)}</div></section></div> : <p className="py-10 text-center">الطالب غير موجود.</p>}</CardContent></Card>{registration?.registrationStatus === "pending" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />اعتماد الدفع</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{field("حالة الدفع", registration.payment?.status === "confirmed" ? "مؤكد" : "قيد المراجعة")}{field("المبلغ المسجل", registration.payment?.amount !== undefined && registration.payment?.amount !== null ? `${registration.payment.amount} ${registration.payment.currency || "EGP"}` : undefined)}</div>{registration.payment?.status !== "confirmed" && <><div className="space-y-2"><Label htmlFor="student-details-paid-amount">المبلغ المدفوع *</Label><Input id="student-details-paid-amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="أدخل المبلغ الفعلي المدفوع" /></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 font-semibold text-primary"><ImagePlus className="h-5 w-5" /><span>{paymentReceipt?.name || "اختيار صورة إيصال التحويل"}</span><input aria-label="اختيار صورة إيصال التحويل" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) return toast.error("اختر صورة إيصال صالحة بحجم لا يتجاوز 20MB."); setPaymentReceipt(file); }} /></label></>}<Button className="w-full gap-2" disabled={approvalLoading || (registration.payment?.status !== "confirmed" && (!paymentReceipt || !paymentAmount.trim() || Number(paymentAmount) <= 0))} onClick={() => void approvePayment()}>{approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}اعتماد الدفع وتفعيل الطالب</Button></CardContent></Card>}<Dialog open={registrationsOpen} onOpenChange={setRegistrationsOpen}><DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>تفاصيل التسجيل</DialogTitle><DialogDescription>الدورات والفصول المرتبط بها الطالب حاليًا أو سابقًا.</DialogDescription></DialogHeader>{registrations.isLoading ? <div className="space-y-3">{[1, 2].map((item) => <Skeleton key={item} className="h-20" />)}</div> : registrations.isError ? <div className="py-8 text-center text-destructive"><p>تعذر تحميل تفاصيل التسجيل.</p><Button className="mt-3" variant="outline" onClick={() => void registrations.refetch()}>إعادة المحاولة</Button></div> : <div className="space-y-6"><section><h2 className="mb-3 text-base font-semibold">الدورات المسجل بها</h2>{registrations.data?.courses.length ? <div className="space-y-2">{registrations.data.courses.map((registration) => <div key={registration.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{entityName(registration.course)}</p><p className="mt-1 text-muted-foreground">{registration.group?.name ? `المجموعة: ${registration.group.name}` : "تسجيل فردي أو بدون مجموعة"}</p><p className="text-muted-foreground">{registration.classroom?.name ? `الفصل: ${registration.classroom.name}` : "لم يُنشأ فصل بعد"}</p><p className="mt-1 text-xs text-muted-foreground">{registration.mode === "group" ? "جماعي" : registration.mode === "individual" ? "فردي" : "—"} · {courseEnrollmentStatus[registration.status || ""] || registration.status || "—"}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد تسجيلات دورات.</p>}</section><section><h2 className="mb-3 text-base font-semibold">الفصول المسجل بها</h2>{registrations.data?.classrooms.length ? <div className="space-y-2">{registrations.data.classrooms.map((registration) => <div key={registration.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{entityName(registration.classroom)}</p><p className="mt-1 text-muted-foreground">{registration.classroom?.course?.name ? `الدورة: ${registration.classroom.course.name}` : registration.classroom?.sourceType === "course" ? "فصل دورة" : "فصل أكاديمي"}</p><p className="mt-1 text-xs text-muted-foreground">{classroomEnrollmentStatus[registration.status || ""] || registration.status || "—"}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد تسجيلات فصول.</p>}</section></div>}</DialogContent></Dialog></div></DashboardLayout>;
}
