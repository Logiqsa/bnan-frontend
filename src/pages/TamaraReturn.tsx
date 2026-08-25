import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paymentApi, type TamaraStatusResult } from "@/api/paymentApi";
import { ApiError } from "@/api/client";
import { tamaraDraftStore } from "@/lib/tamaraDraft";
import logo from "@/assets/logo-bnan.png";
import AccountVerification from "@/components/AccountVerification";

const POLL_INTERVAL_MS = 2500;
const MAX_AUTO_ATTEMPTS = 24; // ~60 seconds of automatic polling
const REFRESH_COOLDOWN_MS = 10000;

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "expired", "refunded"]);

const friendlyError = (error: unknown) => {
  const apiError = error as ApiError;
  return apiError.message || "تعذر التحقق من حالة الدفع.";
};

const INITIAL_MESSAGE: Record<"success" | "failure" | "cancel", string> = {
  success: "جاري تأكيد عملية الدفع...",
  failure: "حدث خطأ أثناء المحاولة، جاري التحقق من الحالة الفعلية...",
  cancel: "تم إلغاء العملية، جاري التحقق من الحالة الفعلية...",
};

export default function TamaraReturn({ kind }: { kind: "success" | "failure" | "cancel" }) {
  const draft = useMemo(() => tamaraDraftStore.read(), []);
  const [phase, setPhase] = useState<"polling" | "settled" | "missing">(draft ? "polling" : "missing");
  const [result, setResult] = useState<TamaraStatusResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    if (!draft) return;
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await paymentApi.status(draft.paymentId);
        if (cancelled) return;
        setResult(data);
        setError("");
        if (TERMINAL_STATUSES.has(data.status)) {
          setPhase("settled");
          return;
        }
      } catch (value) {
        if (cancelled) return;
        setError(friendlyError(value));
      }
      attempts += 1;
      if (attempts >= MAX_AUTO_ATTEMPTS) { setPhase("settled"); return; }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; };
  }, [draft]);

  const manualRefresh = async () => {
    if (!draft || Date.now() < cooldownUntil) return;
    setRefreshing(true);
    setError("");
    setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
    try {
      const { data } = await paymentApi.reconcile(draft.paymentId);
      setResult(data);
      if (TERMINAL_STATUSES.has(data.status)) setPhase("settled");
    } catch (value) {
      setError(friendlyError(value));
    } finally {
      setRefreshing(false);
    }
  };

  const retry = () => {
    tamaraDraftStore.clear();
    window.location.href = "/register/student";
  };

  return (
    <main className="min-h-screen bg-hero-gradient grid place-items-center p-4" dir="rtl">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="p-8 space-y-4">
          <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
            <img src={logo} alt="أكاديمية بنان" className="h-10 w-auto mx-auto" />
          </Link>

          {phase === "missing" && (
            <>
              <h1 className="text-xl font-cairo font-bold">لا يوجد طلب دفع نشط</h1>
              <p className="text-muted-foreground font-tajawal">
                لم نعثر على بيانات عملية دفع في هذا المتصفح. إذا كنت قد أتممت الدفع بالفعل يمكنك تسجيل الدخول مباشرة.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button asChild variant="outline"><Link to="/register/student">إعادة التسجيل</Link></Button>
                <Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button>
              </div>
            </>
          )}

          {phase === "polling" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto" />
              <h1 className="text-xl font-cairo font-bold">{INITIAL_MESSAGE[kind]}</h1>
              <p className="text-muted-foreground font-tajawal text-sm">قد يستغرق هذا بضع ثوانٍ، برجاء عدم إغلاق الصفحة.</p>
            </>
          )}

          {phase === "settled" && result?.status === "completed" && (
            draft?.studentEmail ? <AccountVerification embedded email={draft.studentEmail} onVerified={() => { tamaraDraftStore.clear(); window.location.href = `/portal/login?email=${encodeURIComponent(draft.studentEmail)}&verified=1`; }} /> : <>
              <div className="h-14 w-14 rounded-full bg-green-100 text-green-700 grid place-items-center mx-auto"><Check /></div>
              <h1 className="text-2xl font-cairo font-bold">تم الدفع بنجاح</h1>
              <p className="text-muted-foreground font-tajawal">راجع بريد الطالب لتفعيل الحساب قبل تسجيل الدخول.</p>
              <Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button>
            </>
          )}

          {phase === "settled" && result && ["failed", "cancelled", "expired"].includes(result.status) && (
            <>
              <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
                <X />
              </div>
              <h1 className="text-2xl font-cairo font-bold">لم تكتمل عملية الدفع</h1>
              <p className="text-muted-foreground font-tajawal">يمكنك إعادة محاولة التسجيل والدفع من جديد.</p>
              <Button onClick={retry}>محاولة جديدة</Button>
            </>
          )}

          {phase === "settled" && result?.status === "refunded" && (
            <>
              <h1 className="text-xl font-cairo font-bold">تم استرجاع المبلغ</h1>
              <p className="text-muted-foreground font-tajawal">لا يعتبر الاشتراك ساريًا حاليًا. تواصل مع الدعم للمزيد من التفاصيل.</p>
            </>
          )}

          {phase === "settled" && (!result || !TERMINAL_STATUSES.has(result.status)) && (
            <>
              <h1 className="text-xl font-cairo font-bold">جاري تأكيد الدفع</h1>
              <p className="text-muted-foreground font-tajawal text-sm">
                لم تصل نتيجة نهائية بعد. اضغط تحديث بعد قليل، أو تواصل مع الدعم إذا استمرت الحالة.
              </p>
              <Button onClick={manualRefresh} disabled={refreshing || Date.now() < cooldownUntil} variant="outline" className="gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                تحديث الحالة
              </Button>
            </>
          )}

          {error && <p className="text-sm text-destructive font-tajawal">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
