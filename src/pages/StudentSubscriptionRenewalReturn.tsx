import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/client";
import {
  subscriptionRenewalApi,
  type GulfRenewalStatusResult,
} from "@/api/subscriptionRenewalApi";
import { studentHomeQueryKey } from "@/api/studentHomeApi";
import { studentSubscriptionsQueryKey } from "@/api/studentSubscriptionApi";
import logo from "@/assets/logo-bnan.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import { usePortalAuth } from "@/portal/PortalAuthContext";

const processingStatuses = new Set(["pending", "authorized", "captured"]);
const failedStatuses = new Set([
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

export default function StudentSubscriptionRenewalReturn() {
  const { user, loading: authLoading } = usePortalAuth();
  const queryClient = useQueryClient();
  const draft = useMemo(() => {
    const stored = gulfPaymentDraftStore.read();
    return stored?.purpose === "renewal" ? stored : null;
  }, []);
  const [result, setResult] = useState<GulfRenewalStatusResult | null>(null);
  const [loading, setLoading] = useState(Boolean(draft));
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!draft || user?.role !== "student") return;
    setLoading(true);
    setError("");
    try {
      const status = await subscriptionRenewalApi.getGulfRenewalStatus(
        draft.paymentId,
      );
      setResult(status);
      if (status.status === "completed") {
        gulfPaymentDraftStore.clear();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: studentSubscriptionsQueryKey }),
          queryClient.invalidateQueries({ queryKey: studentHomeQueryKey }),
        ]);
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.message
          ? reason.message
          : "تعذر التحقق من حالة تجديد الاشتراك.",
      );
    } finally {
      setLoading(false);
    }
  }, [draft, queryClient, user?.role]);

  useEffect(() => {
    if (!authLoading) void verify();
  }, [authLoading, verify]);

  return (
    <main className="grid min-h-screen place-items-center bg-hero-gradient p-4" dir="rtl">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="space-y-4 p-8">
          <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
            <img src={logo} alt="أكاديمية بنان" className="mx-auto h-10 w-auto" />
          </Link>

          {authLoading ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold">جاري التحقق من جلسة الطالب...</h1>
            </>
          ) : !user || user.role !== "student" ? (
            <>
              <h1 className="text-xl font-bold">يلزم تسجيل دخول الطالب</h1>
              <p className="text-sm text-muted-foreground">
                سجّل الدخول بحساب الطالب للتحقق من حالة تجديد الاشتراك.
              </p>
              <Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button>
            </>
          ) : !draft ? (
            <>
              <h1 className="text-xl font-bold">لا توجد عملية تجديد صالحة</h1>
              <p className="text-sm text-muted-foreground">
                لم نعثر على بيانات دفع صالحة مرتبطة بتجديد اشتراك.
              </p>
              <Button asChild><Link to="/portal/student/subscriptions">العودة إلى الاشتراكات</Link></Button>
            </>
          ) : loading ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold">جاري التحقق من حالة الدفع...</h1>
              <p className="text-sm text-muted-foreground">
                يتم الاعتماد على الحالة المسجلة في النظام، وليس رابط العودة.
              </p>
            </>
          ) : result?.status === "completed" ? (
            <>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><Check /></span>
              <h1 className="text-2xl font-bold">تم تجديد الاشتراك بنجاح</h1>
              <p className="text-sm text-muted-foreground">تم تأكيد الدفع وإنشاء الاشتراك الجديد.</p>
              <Button asChild><Link to="/portal/student/subscriptions">عرض الاشتراكات</Link></Button>
            </>
          ) : result && failedStatuses.has(result.status) ? (
            <>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><X /></span>
              <h1 className="text-2xl font-bold">لم يكتمل تجديد الاشتراك</h1>
              <p className="text-sm text-muted-foreground">حالة العملية: {result.status}</p>
              <Button asChild variant="outline"><Link to="/portal/student/subscriptions">العودة إلى الاشتراكات</Link></Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">عملية التجديد قيد المعالجة</h1>
              <p className="text-sm text-muted-foreground">
                {result && processingStatuses.has(result.status)
                  ? `حالة العملية: ${result.status}`
                  : "لم تصل نتيجة نهائية بعد."}
              </p>
              <Button asChild variant="outline"><Link to="/portal/student/subscriptions">العودة إلى الاشتراكات</Link></Button>
            </>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
