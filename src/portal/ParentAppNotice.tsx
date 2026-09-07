import { Link, useSearchParams } from "react-router-dom";
import { Home, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import logo from "@/assets/logo-bnan.png";
import parentAppHint from "@/assets/parent-app-hint.png";

export default function ParentAppNotice() {
  const { isArabic, pick } = useLanguage();
  const [searchParams] = useSearchParams();
  const passwordReset = searchParams.get("passwordReset") === "1";

  return <main className="relative min-h-screen overflow-hidden bg-hero-gradient px-4 py-12" dir={isArabic ? "rtl" : "ltr"}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(221_50%_22%/.38),transparent_48%)]" />
    <LanguageToggle className={`${isArabic ? "left-4 md:left-8" : "right-4 md:right-8"} absolute top-4 z-10 border border-white/20 bg-white/10 text-white hover:bg-white/20 md:top-6`} />
    <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-lg flex-col items-center justify-center">
      <Link to="/"><img src={logo} alt="BNAN Academy" className="mb-4 h-24 brightness-0 invert" /></Link>
      <Card className="w-full overflow-hidden border-white/10 bg-card/95 shadow-2xl"><CardContent className="p-6 text-center md:p-8">
        <img src={parentAppHint} alt={pick("ولي أمر يستخدم تطبيق بنان", "A parent using the BNAN app")} className="mx-auto aspect-square w-full max-w-[280px] rounded-2xl object-cover shadow-md" />
        <div className="mx-auto mt-5 grid h-12 w-12 place-items-center rounded-full bg-secondary/15 text-secondary"><Smartphone className="h-6 w-6" /></div>
        <h1 className="mt-4 text-2xl font-bold">{pick("حساب وليّ الأمر يُدار عبر تطبيق Bnan", "Parent accounts are managed through the BNAN app")}</h1>
        {passwordReset && <p role="status" className="mt-4 rounded-xl bg-green-100 p-3 text-sm text-green-700">{pick("تم تغيير كلمة المرور بنجاح. استخدم كلمة المرور الجديدة في التطبيق.", "Password changed successfully. Use your new password in the app.")}</p>}
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{pick("يمكنك تسجيل الدخول ومتابعة الأبناء والحصص وإدارة حسابك بالكامل من خلال تطبيق Bnan. بوابة الويب مخصّصة للطلاب والمعلمين والمشرفين والإدارة.", "Sign in, follow your children and lessons, and manage your account through the BNAN app. The web portal is for students, teachers, supervisors, and administrators.")}</p>
        <Button asChild className="mt-6 h-12 w-full"><Link to="/"><Home className="h-4 w-4" />{pick("العودة إلى الصفحة الرئيسية", "Back to home")}</Link></Button>
      </CardContent></Card>
    </div>
  </main>;
}
