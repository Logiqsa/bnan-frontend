import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { studentSubjectRequestsApi, type SubjectRequestPaymentStatus } from "@/api/studentSubjectRequestsApi";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo-bnan.png";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const completedStatuses = new Set(["completed"]);
const failedStatuses = new Set(["failed", "cancelled", "canceled", "expired", "rejected", "refunded"]);

export default function StudentSubjectRequestReturn() {
  const { user, loading: authLoading } = usePortalAuth();
  const draft = useMemo(() => {
    const stored = gulfPaymentDraftStore.read();
    return stored?.purpose === "subject_request" ? stored : null;
  }, []);
  const [result, setResult] = useState<SubjectRequestPaymentStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(draft));
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!draft || user?.role !== "student") return;
    setLoading(true);
    setError("");
    try {
      const status = await studentSubjectRequestsApi.checkoutStatus(draft.paymentId);
      setResult(status);
      if (completedStatuses.has(status.status) || failedStatuses.has(status.status)) gulfPaymentDraftStore.clear();
    } catch (reason) {
      setError((reason as ApiError).message || "تعذر التحقق من حالة الدفع.");
    } finally {
      setLoading(false);
    }
  }, [draft, user?.role]);

  useEffect(() => {
    if (!authLoading) void verify();
  }, [authLoading, verify]);

  return <main className="grid min-h-screen place-items-center bg-hero-gradient p-4" dir="rtl"><Card className="w-full max-w-lg text-center"><CardContent className="space-y-4 p-8"><Link to="/" aria-label="العودة إلى الصفحة الرئيسية"><img src={logo} alt="أكاديمية بنان" className="mx-auto h-10 w-auto" /></Link>
    {authLoading ? <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold">جاري التحقق من جلسة الطالب...</h1></>
      : !user || user.role !== "student" ? <><h1 className="text-xl font-bold">يلزم تسجيل دخول الطالب</h1><p className="text-sm text-muted-foreground">سجّل الدخول بحساب الطالب للتحقق من حالة دفع طلب المادة.</p><Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button></>
      : !draft ? <><h1 className="text-xl font-bold">لا توجد عملية دفع طلب مادة صالحة</h1><p className="text-sm text-muted-foreground">لم نعثر على بيانات دفع صالحة مرتبطة بطلب مادة.</p><Button asChild><Link to="/portal/student/subjects">العودة إلى موادي</Link></Button></>
      : loading ? <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold">جاري التحقق من حالة الدفع...</h1><p className="text-sm text-muted-foreground">يتم الاعتماد على حالة الدفع المسجلة في النظام، وليس بيانات رابط العودة.</p></>
      : result && completedStatuses.has(result.status) ? <><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><Check /></span><h1 className="text-2xl font-bold">تم تأكيد الدفع</h1><p className="text-muted-foreground">تم إنشاء طلب المادة. لا يعني ذلك أن المادة تم تفعيلها أو تعيين معلم بعد.</p><Button asChild><Link to="/portal/student/subjects">العودة إلى موادي</Link></Button></>
      : result && failedStatuses.has(result.status) ? <><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><X /></span><h1 className="text-2xl font-bold">لم تكتمل عملية الدفع</h1><p className="text-sm text-muted-foreground">حالة العملية: {result.status}</p><Button asChild variant="outline"><Link to="/portal/student/subjects">العودة إلى موادي</Link></Button></>
      : <><h1 className="text-xl font-bold">عملية الدفع قيد المعالجة</h1><p className="text-sm text-muted-foreground">{result?.status ? `حالة العملية: ${result.status}` : "لم تصل نتيجة نهائية بعد."}</p><Button onClick={() => void verify()} disabled={loading} variant="outline"><RefreshCw className="h-4 w-4" />تحديث الحالة</Button></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent></Card></main>;
}
