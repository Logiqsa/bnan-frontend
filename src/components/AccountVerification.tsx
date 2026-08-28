import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { authApi } from "@/api/authApi";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const COOLDOWN_SECONDS = 60;
const errors: Record<string, string> = {
  EMAIL_AND_CODE_REQUIRED: "أدخل رمز التفعيل المكوّن من 4 أرقام.",
  INVALID_OR_EXPIRED_VERIFICATION_CODE: "الرمز غير صحيح أو انتهت صلاحيته. يمكنك طلب رمز جديد.",
  EMAIL_REQUIRED: "البريد الإلكتروني مطلوب.",
  USER_WITH_EMAIL_NOT_FOUND: "تعذر إرسال رمز التفعيل لهذا البريد.",
};

export default function AccountVerification({ email, onVerified, embedded = false }: { email: string; onVerified: () => void | Promise<void>; embedded?: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [seconds, setSeconds] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const verify = async (submittedCode = code) => {
    if (submittedCode.length !== 4) { setError(errors.EMAIL_AND_CODE_REQUIRED); return; }
    setBusy(true); setError(""); setNotice("");
    try { await authApi.verifyAccount(email, submittedCode); await onVerified(); }
    catch (value) { const apiError = value as ApiError; setError(errors[apiError.code] || apiError.message || "تعذر تفعيل الحساب."); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true); setError(""); setNotice("");
    try {
      await authApi.resendVerificationCode(email);
      setCode(""); setSeconds(COOLDOWN_SECONDS); setNotice("تم إرسال رمز جديد إلى بريدك الإلكتروني.");
    } catch (value) {
      const apiError = value as ApiError;
      if (apiError.code === "ACCOUNT_ALREADY_VERIFIED") { await onVerified(); return; }
      setError(errors[apiError.code] || apiError.message || "تعذر إعادة إرسال الرمز.");
    } finally { setResending(false); }
  };

  const content = <div className="space-y-5 text-center" dir="rtl">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary/15 text-secondary"><ShieldCheck className="h-7 w-7" /></div>
    <div><h1 className="font-cairo text-2xl font-bold">تفعيل الحساب</h1><p className="mt-2 font-tajawal text-sm text-muted-foreground">أدخل رمز التفعيل المكوّن من 4 أرقام الذي أرسلناه إلى</p><p className="mt-1 flex items-center justify-center gap-2 font-medium" dir="ltr"><Mail className="h-4 w-4" />{email}</p></div>
    {error && <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    {notice && <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-green-100 p-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
    <InputOTP autoFocus maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={(value) => { setCode(value); setError(""); }} onComplete={(value) => void verify(value)} disabled={busy} containerClassName="justify-center" inputMode="numeric">
      <InputOTPGroup dir="ltr">{[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} className="h-14 w-14 text-xl" />)}</InputOTPGroup>
    </InputOTP>
    <Button type="button" className="h-12 w-full" disabled={busy || code.length !== 4} onClick={() => void verify()}>{busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}{busy ? "جاري التفعيل..." : "تفعيل الحساب"}</Button>
    <div className="text-sm text-muted-foreground">لم يصلك الرمز؟ <Button type="button" variant="link" className="h-auto p-1" disabled={seconds > 0 || resending} onClick={() => void resend()}>{resending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-1 h-4 w-4" />}{seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الكود"}</Button></div>
    <p className="text-xs text-muted-foreground">الرمز صالح لمدة 10 دقائق. طلب رمز جديد يلغي الرمز السابق.</p>
  </div>;

  if (embedded) return content;
  return <main className="grid min-h-screen place-items-center bg-hero-gradient p-4"><Card className="w-full max-w-md"><CardContent className="p-7">{content}</CardContent></Card></main>;
}
