import { Link } from "react-router-dom";
import { GraduationCap, Home, School, ArrowLeft, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo-bnan.png";
import { useLanguage } from "@/i18n/LanguageContext";

const AccountTypeSelect = () => {
  const { isArabic, toggleLanguage, pick } = useLanguage();
  const options = [
    { id: "student", to: "/register/student", icon: GraduationCap, title: pick("طالب", "Student"), description: pick("سجّل بياناتك واختر المنهج والباقة المناسبة لبدء رحلتك التعليمية.", "Enter your details and choose the right curriculum and package to start learning.") },
    { id: "teacher", to: "/portal/teacher/signup", icon: School, title: pick("معلم", "Teacher"), description: pick("انضم إلى فريق المعلمين في أكاديمية بنان وابدأ بتقديم حصصك.", "Join BNAN Academy's teaching team and start delivering your classes.") },
  ];
  return (
    <main className="relative min-h-screen overflow-hidden bg-hero-gradient px-4 py-16" dir={isArabic ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(221_50%_22%/.38),transparent_48%)]" />

      <Link
        to="/"
        className="absolute right-4 top-4 md:right-8 md:top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
      >
        <Home className="w-4 h-4" />
        {pick("الصفحة الرئيسية", "Home")}
      </Link>
      <button
        type="button"
        onClick={toggleLanguage}
        className="fixed left-4 top-4 z-20 inline-flex items-center gap-[6px] rounded-full bg-white/10 px-3 py-1.5 font-cairo text-sm text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        aria-label={pick("التبديل إلى الإنجليزية", "التبديل إلى العربية")}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {isArabic ? "EN" : "عربي"}
      </button>

      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col items-center justify-center">
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="mx-auto h-28 brightness-0 invert md:h-32" />
        </Link>

        <div className="mb-10 mt-3 text-center text-white">
          <h1 className="text-3xl font-cairo font-bold">{pick("إنشاء حساب", "Create account")}</h1>
          <p className="mt-2 text-sm text-white/60 font-tajawal">{pick("اختر نوع الحساب المناسب لك للمتابعة", "Choose your account type to continue")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {options.map((option) => (
            <Link key={option.id} to={option.to}>
              <Card className="h-full border-white/10 bg-card/95 shadow-2xl hover:shadow-sky hover:-translate-y-1 transition-all">
                <CardContent className="p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <option.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-cairo font-bold text-foreground mb-2">{option.title}</h2>
                  <p className="text-sm font-tajawal text-muted-foreground leading-relaxed mb-5">
                    {option.description}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-cairo font-semibold text-secondary">
                    {pick("ابدأ الآن", "Get started")}
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/55 font-tajawal">
          {pick("لديك حساب بالفعل؟", "Already have an account?")}{" "}
          <Link className="font-semibold text-secondary hover:underline" to="/portal/login">
            {pick("سجّل الدخول", "Log in")}
          </Link>
        </p>
      </div>
    </main>
  );
};

export default AccountTypeSelect;
