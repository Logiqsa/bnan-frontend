import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { coursesApi, type CourseEnrollment, type NamedRef } from "@/api/coursesApi";
import logo from "@/assets/logo-bnan.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const enrollmentQueryKey = ["my-course-enrollments"] as const;
const terminalStatuses = new Set(["cancelled", "refunded", "expired", "removed"]);

const referenceId = (value?: string | NamedRef | null) =>
  typeof value === "string" ? value : value?.id || value?._id || "";

const enrollmentForPayment = (rows: CourseEnrollment[], paymentId: string) =>
  rows.find((enrollment) => referenceId(enrollment.payment) === paymentId);

export default function StudentCourseEnrollmentReturn() {
  const { user, loading: authLoading } = usePortalAuth();
  const queryClient = useQueryClient();
  const draft = useMemo(() => {
    const stored = gulfPaymentDraftStore.read();
    return stored?.purpose === "course_enrollment" ? stored : null;
  }, []);
  const query = useQuery({
    queryKey: enrollmentQueryKey,
    queryFn: coursesApi.myEnrollments,
    enabled: !authLoading && user?.role === "student" && Boolean(draft),
    retry: 1,
  });
  const enrollment = draft && query.data
    ? enrollmentForPayment(query.data, draft.paymentId)
    : undefined;
  const successful = enrollment?.status === "active";
  const terminal = Boolean(enrollment && terminalStatuses.has(enrollment.status));

  useEffect(() => {
    if (!successful && !terminal) return;
    gulfPaymentDraftStore.clear();
    if (successful) {
      void queryClient.invalidateQueries({ queryKey: enrollmentQueryKey });
    }
  }, [queryClient, successful, terminal]);

  return (
    <main className="grid min-h-screen place-items-center bg-hero-gradient p-4" dir="rtl">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="space-y-4 p-8">
          <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
            <img src={logo} alt="أكاديمية بنان" className="mx-auto h-10 w-auto" />
          </Link>

          {authLoading ? (
            <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold">جاري التحقق من جلسة الطالب...</h1></>
          ) : !user || user.role !== "student" ? (
            <><h1 className="text-xl font-bold">يلزم تسجيل دخول الطالب</h1><p className="text-sm text-muted-foreground">سجّل الدخول بحساب الطالب للتحقق من تسجيل الدورة.</p><Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button></>
          ) : !draft ? (
            <><h1 className="text-xl font-bold">لا توجد عملية دفع دورة صالحة</h1><p className="text-sm text-muted-foreground">لم نعثر على محاولة دفع محفوظة لهذه الدورة.</p><Button asChild><Link to="/portal/student/courses">العودة إلى دوراتي</Link></Button></>
          ) : query.isLoading ? (
            <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold">جاري تأكيد الدفع...</h1><p className="text-sm text-muted-foreground">نراجع حالة التسجيل المسجلة في النظام.</p></>
          ) : query.isError ? (
            <><h1 className="text-xl font-bold">تعذر التحقق من التسجيل</h1><p className="text-sm text-destructive">تعذر تحميل دورات الطالب حاليًا.</p><Button type="button" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />تحقق مرة أخرى</Button></>
          ) : successful ? (
            <><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><Check /></span><h1 className="text-2xl font-bold">تم إعادة الاشتراك في الدورة بنجاح</h1><p className="text-sm text-muted-foreground">أكد النظام تفعيل الجولة الجديدة.</p><Button asChild><Link to="/portal/student/courses">عرض دوراتي</Link></Button></>
          ) : terminal ? (
            <><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><X /></span><h1 className="text-2xl font-bold">لم تكتمل إعادة الاشتراك</h1><p className="text-sm text-muted-foreground">حالة التسجيل: {enrollment?.status}</p><Button asChild variant="outline"><Link to="/portal/student/courses">العودة إلى دوراتي</Link></Button></>
          ) : (
            <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold">جاري تأكيد الدفع...</h1><p className="text-sm text-muted-foreground">{enrollment?.status === "pending" ? "تم إنشاء التسجيل، وما زال الدفع قيد التأكيد." : "لم يظهر التسجيل المرتبط بعملية الدفع بعد."}</p><div className="flex flex-wrap justify-center gap-3"><Button type="button" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />تحقق مرة أخرى</Button><Button asChild variant="outline"><Link to="/portal/student/courses">العودة إلى دوراتي</Link></Button></div></>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
