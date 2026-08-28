import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paymentApi, type GulfPaymentStatusResult } from "@/api/paymentApi";
import { ApiError } from "@/api/client";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import logo from "@/assets/logo-bnan.png";
import AccountVerification from "@/components/AccountVerification";
import { authApi } from "@/api/authApi";
import { tokenStore } from "@/api/client";
import { studentSignupSession } from "@/lib/studentSignupSession";

const POLL_INTERVAL_MS = 3000;
const MAX_AUTO_ATTEMPTS = 20; // 60 seconds of automatic polling
const REFRESH_COOLDOWN_MS = 10000;

const TERMINAL_STATUSES = new Set(["failed", "cancelled", "expired", "refunded"]);
const isRegistrationCompleted = (payment: GulfPaymentStatusResult) =>
  payment.status === "completed" && Boolean(payment.studentId);

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
  const draft = useMemo(() => gulfPaymentDraftStore.read(), []);
  const [phase, setPhase] = useState<"polling" | "settled" | "missing">(draft ? "polling" : "missing");
  const [result, setResult] = useState<GulfPaymentStatusResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [studentLoginState, setStudentLoginState] = useState<"idle" | "logging-in" | "error">("idle");

  useEffect(() => {
    if (!draft) return;
    let attempts = 0;
    let cancelled = false;
    window.history.replaceState({}, "", window.location.pathname);

    const poll = async () => {
      try {
        const { data } = await paymentApi.status(draft.provider, draft.paymentId);
        if (cancelled) return;
        setResult(data);
        setError("");
        if (isRegistrationCompleted(data) || TERMINAL_STATUSES.has(data.status)) {
          localStorage.removeItem("tamaraPaymentId");
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

    const verifyThenPoll = async () => {
      if (draft.provider === "tamara") {
        try {
          const { data } = await paymentApi.reconcile(draft.paymentId);
          if (cancelled) return;
          setResult(data);
          setError("");
          if (isRegistrationCompleted(data) || TERMINAL_STATUSES.has(data.status)) {
            localStorage.removeItem("tamaraPaymentId");
            setPhase("settled");
            return;
          }
        } catch {
          // الرجوع إلى status polling هو الـ fallback الآمن عند فشل reconcile.
        }
      }
      poll();
    };

    verifyThenPoll();
    return () => { cancelled = true; };
  }, [draft]);

  const loginStudent = useCallback(async () => {
    if (!draft) return;
    const credentials = studentSignupSession.credentials(draft.paymentId);
    if (!credentials) {
      setStudentLoginState("error");
      setError("تم الدفع، لكن تعذر استعادة بيانات دخول الطالب. سجّل الدخول يدويًا.");
      return;
    }
    setStudentLoginState("logging-in");
    setError("");
    try {
      const login = await authApi.login(credentials.email, credentials.password);
      tokenStore.set(login.token, login.refreshToken);
      localStorage.setItem("bnan_portal_user", JSON.stringify(login.data));
      studentSignupSession.clear();
      gulfPaymentDraftStore.clear();
      window.location.href = "/portal/student/schedule";
    } catch (value) {
      setStudentLoginState("error");
      setError(friendlyError(value));
    }
  }, [draft]);

  const manualRefresh = async () => {
    if (!draft || Date.now() < cooldownUntil) return;
    setRefreshing(true);
    setError("");
    setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
    try {
      const { data } = draft.provider === "tamara"
        ? await paymentApi.reconcile(draft.paymentId)
        : await paymentApi.status(draft.provider, draft.paymentId);
      setResult(data);
      if (isRegistrationCompleted(data) || TERMINAL_STATUSES.has(data.status)) {
        localStorage.removeItem("tamaraPaymentId");
        setPhase("settled");
      }
    } catch (value) {
      setError(friendlyError(value));
    } finally {
      setRefreshing(false);
    }
  };

  const retry = () => {
    gulfPaymentDraftStore.clear();
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

          {phase === "settled" && result && isRegistrationCompleted(result) && (
            studentLoginState === "idle" && draft?.studentEmail ? <AccountVerification embedded email={draft.studentEmail} onVerified={loginStudent} /> :
            result.status === "completed" && studentLoginState === "logging-in" ? <>
              <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto" />
              <h1 className="text-xl font-cairo font-bold">جاري تسجيل دخول الطالب...</h1>
            </> : <>
              <div className="h-14 w-14 rounded-full bg-green-100 text-green-700 grid place-items-center mx-auto"><Check /></div>
              <h1 className="text-2xl font-cairo font-bold">تم الدفع بنجاح</h1>
              <p className="text-muted-foreground font-tajawal">تم الدفع وتفعيل الاشتراك بنجاح.</p>
              {studentLoginState === "error" ? <Button asChild><Link to={`/portal/login?email=${encodeURIComponent(draft?.studentEmail || "")}`}>تسجيل الدخول يدويًا</Link></Button> : <Button asChild><Link to="/portal/login">تسجيل الدخول</Link></Button>}
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

          {phase === "settled" && (!result || (!isRegistrationCompleted(result) && !TERMINAL_STATUSES.has(result.status))) && (
            <>
              <h1 className="text-xl font-cairo font-bold">جاري تأكيد الدفع</h1>
              <p className="text-muted-foreground font-tajawal text-sm">
                {result?.status === "completed" && !result.studentId
                  ? "تم تأكيد الدفع، لكن إنشاء حساب الطالب لم يكتمل بعد. اضغط تحديث لإعادة المزامنة."
                  : "لم تصل نتيجة نهائية بعد. اضغط تحديث بعد قليل، أو تواصل مع الدعم إذا استمرت الحالة."}
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
