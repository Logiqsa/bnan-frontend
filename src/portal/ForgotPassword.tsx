import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Home, Loader2, Lock, Mail, RotateCcw } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ApiError } from "@/api/client";
import { authApi } from "@/api/authApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import logo from "@/assets/logo-bnan.png";
import { usePortalAuth } from "./PortalAuthContext";

type Step = "email" | "otp" | "password";
const CODE_LIFETIME_SECONDS = 10 * 60;

const messageFor = (error: ApiError, fallback: string) => {
  const messages: Record<string, string> = {
    USER_WITH_EMAIL_NOT_FOUND: "البريد الإلكتروني غير مسجل.",
    INVALID_OR_EXPIRED_RESET_CODE: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية.",
    PASSWORD_RESET_RATE_LIMIT_EXCEEDED: "محاولات كثيرة، حاول لاحقًا.",
    ERROR_SENDING_EMAIL: "تعذر إرسال البريد الإلكتروني، حاول لاحقًا.",
  };
  return messages[error.code] || error.message || fallback;
};

const homeFor = (role: string) => role === "admin" ? "/admin" : `/portal/${role}/schedule`;

export default function ForgotPassword() {
  const { user } = usePortalAuth();
  const { isArabic, pick } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [, setClock] = useState(Date.now());

  useEffect(() => {
    sessionStorage.removeItem("bnan_password_reset_flow");
  }, []);

  useEffect(() => {
    if (step !== "otp" && !rateLimitedUntil) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, rateLimitedUntil]);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const handleError = (value: unknown, fallback: string) => {
    const apiError = value as ApiError;
    if (apiError.code === "PASSWORD_RESET_RATE_LIMIT_EXCEEDED" || apiError.status === 429)
      setRateLimitedUntil(Date.now() + 60_000);
    setError(messageFor(apiError, fallback));
  };

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (Date.now() < rateLimitedUntil) return;
    setBusy(true); setError(""); setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await authApi.forgotPassword(normalizedEmail);
      const now = Date.now();
      setEmail(normalizedEmail); setSentAt(now); setOtp("");
      setStep("otp");
      setNotice(response.message || "تم إرسال الرمز إلى البريد الإلكتروني بنجاح.");
    } catch (value) { handleError(value, "تعذر إرسال رمز التحقق."); }
    finally { setBusy(false); }
  };

  const verifyCode = async (event?: React.FormEvent, submittedCode = otp) => {
    event?.preventDefault(); setError(""); setNotice("");
    if (!/^\d{4}$/.test(submittedCode)) { setError("أدخل رمز التحقق المكوّن من 4 أرقام."); return; }
    setBusy(true);
    try { await authApi.verifyResetCode(submittedCode); setStep("password"); }
    catch (value) { handleError(value, "تعذر التحقق من الرمز."); }
    finally { setBusy(false); }
  };

  const setNewPassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setPasswordError(""); setNotice("");
    if (password.length < 8) { setPasswordError("يجب ألا تقل كلمة المرور عن 8 أحرف."); return; }
    if (password !== confirmation) { setPasswordError("كلمتا المرور غير متطابقتين."); return; }
    setBusy(true);
    try {
      const response = await authApi.resetPassword(email, password);
      const role = String(response.data.role);
      if (role === "parent") navigate("/portal/parent-app?passwordReset=1", { replace: true });
      else navigate(`/portal/login?reset=1&email=${encodeURIComponent(email)}`, { replace: true });
    } catch (value) {
      const apiError = value as ApiError;
      if (apiError.code === "RESET_CODE_NOT_VERIFIED") { setStep("otp"); setOtp(""); }
      const validationMessage = messageFor(apiError, "تعذر تعيين كلمة المرور الجديدة.");
      if (apiError.status === 400 && apiError.code !== "RESET_CODE_NOT_VERIFIED") setPasswordError(validationMessage);
      else handleError(value, "تعذر تعيين كلمة المرور الجديدة.");
    } finally { setBusy(false); }
  };

  const remaining = Math.max(0, CODE_LIFETIME_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
  const rateLimitRemaining = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
  const timeText = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const title = step === "email" ? pick("نسيت كلمة المرور", "Forgot password") : step === "otp" ? pick("رمز التحقق", "Verification code") : pick("كلمة مرور جديدة", "New password");

  return (
    <main className="relative min-h-screen overflow-hidden bg-hero-gradient px-4 py-16" dir={isArabic ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(221_50%_22%/.38),transparent_48%)]" />
      <Button asChild variant="outline" className={`${isArabic ? "right-4 md:right-8" : "left-4 md:left-8"} absolute top-4 z-10 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white md:top-6`}>
        <Link to="/"><Home className="h-4 w-4" />{pick("الصفحة الرئيسية", "Home")}</Link>
      </Button>
      <LanguageToggle className={`${isArabic ? "left-4 md:left-8" : "right-4 md:right-8"} absolute top-4 z-10 border border-white/20 bg-white/10 text-white hover:bg-white/20 md:top-6`} />
      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col items-center justify-center">
        <Link to="/"><img src={logo} alt="BNAN Academy" className="mx-auto h-28 brightness-0 invert md:h-32" /></Link>
        <div className="mb-7 mt-3 text-center text-white">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-white/60">
            {step === "email" ? pick("أدخل بريدك لنرسل إليك رمز الاستعادة", "Enter your email to receive a reset code") : step === "otp" ? pick(`أرسلنا رمزًا من 4 أرقام إلى ${email}`, `We sent a 4-digit code to ${email}`) : pick("أنشئ كلمة مرور قوية لحسابك", "Create a strong password for your account")}
          </p>
        </div>
        <Card className="w-full border-white/10 bg-card/95 shadow-2xl"><CardContent className="p-6 md:p-7">
          {error && <div role="alert" className="mb-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {notice && <div role="status" className="mb-5 rounded-xl bg-green-100 p-3 text-sm text-green-700">{notice}</div>}

          {step === "email" && <form onSubmit={sendCode} className="space-y-5">
            <label className="block text-sm font-medium">{pick("البريد الإلكتروني", "Email")}
              <div className="relative mt-2"><Mail className={`${isArabic ? "right-3" : "left-3"} absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                <Input type="email" required autoComplete="email" dir="ltr" className="h-12 px-10 text-left" placeholder="example@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <Button disabled={busy || rateLimitRemaining > 0} className="h-12 w-full gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{rateLimitRemaining ? `${pick("حاول بعد", "Try after")} ${rateLimitRemaining}s` : pick("إرسال رمز التحقق", "Send verification code")}</Button>
          </form>}

          {step === "otp" && <form onSubmit={verifyCode} className="space-y-5">
            <label className="block text-center text-sm font-medium">{pick("رمز التحقق", "Verification code")}
              <InputOTP autoFocus maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={otp} onChange={(value) => { setOtp(value); setError(""); }} onComplete={(value) => void verifyCode(undefined, value)} disabled={busy} containerClassName="mt-2 justify-center" inputMode="numeric">
                <InputOTPGroup dir="ltr">{[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} className="h-14 w-14 text-xl" />)}</InputOTPGroup>
              </InputOTP>
            </label>
            <p className="text-center text-xs text-muted-foreground">{remaining ? `${pick("صلاحية الرمز المتبقية", "Code expires in")}: ${timeText}` : pick("انتهت صلاحية الرمز؛ اطلب رمزًا جديدًا.", "The code has expired; request a new one.")}</p>
            <Button disabled={busy || otp.length !== 4 || rateLimitRemaining > 0} className="h-12 w-full gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{rateLimitRemaining ? `${pick("حاول بعد", "Try after")} ${rateLimitRemaining}s` : pick("تحقق من الرمز", "Verify code")}</Button>
            <Button type="button" variant="outline" disabled={busy || rateLimitRemaining > 0} onClick={() => void sendCode()} className="h-11 w-full gap-2"><RotateCcw className="h-4 w-4" />{rateLimitRemaining ? `${pick("حاول بعد", "Try after")} ${rateLimitRemaining}s` : pick("إعادة إرسال الرمز", "Resend code")}</Button>
          </form>}

          {step === "password" && <form onSubmit={setNewPassword} className="space-y-5">
            {[{ label: pick("كلمة المرور الجديدة", "New password"), value: password, set: setPassword, autoComplete: "new-password" }, { label: pick("تأكيد كلمة المرور", "Confirm password"), value: confirmation, set: setConfirmation, autoComplete: "new-password" }].map((field) => <label key={field.label} className="block text-sm font-medium">{field.label}
              <div className="relative mt-2"><Lock className={`${isArabic ? "right-3" : "left-3"} absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                <Input type={showPassword ? "text" : "password"} required minLength={8} autoComplete={field.autoComplete} dir="ltr" aria-invalid={Boolean(passwordError)} className="h-12 px-10 text-left" value={field.value} onChange={(event) => { field.set(event.target.value); setPasswordError(""); }} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className={`${isArabic ? "left-3" : "right-3"} absolute top-1/2 -translate-y-1/2 text-muted-foreground`} aria-label={showPassword ? pick("إخفاء كلمة المرور", "Hide password") : pick("إظهار كلمة المرور", "Show password")}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>)}
            {passwordError && <p role="alert" className="-mt-3 text-sm text-destructive">{passwordError}</p>}
            <p className="text-xs text-muted-foreground">{pick("8 أحرف على الأقل", "At least 8 characters")}</p>
            <Button disabled={busy || rateLimitRemaining > 0} className="h-12 w-full gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{rateLimitRemaining ? `${pick("حاول بعد", "Try after")} ${rateLimitRemaining}s` : pick("تعيين كلمة المرور", "Set password")}</Button>
          </form>}

          <div className="mt-5 border-t pt-5 text-center text-sm"><Link to="/portal/login" className="inline-flex items-center gap-1 font-semibold text-secondary hover:underline"><ArrowRight className={`h-4 w-4 ${isArabic ? "" : "rotate-180"}`} />{pick("العودة لتسجيل الدخول", "Back to login")}</Link></div>
        </CardContent></Card>
      </div>
    </main>
  );
}
