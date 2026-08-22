import { Link } from "react-router-dom";
import { GraduationCap, Home, School, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo-bnan.png";

const options = [
  {
    id: "student",
    to: "/register/student",
    icon: GraduationCap,
    title: "طالب",
    description: "سجّل بياناتك واختر المنهج والباقة المناسبة لبدء رحلتك التعليمية.",
  },
  {
    id: "teacher",
    to: "/portal/teacher/signup",
    icon: School,
    title: "معلم",
    description: "انضم إلى فريق المعلمين في أكاديمية بنان وابدأ بتقديم حصصك.",
  },
];

const AccountTypeSelect = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-hero-gradient px-4 py-16" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(221_50%_22%/.38),transparent_48%)]" />

      <Link
        to="/"
        className="absolute right-4 top-4 md:right-8 md:top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
      >
        <Home className="w-4 h-4" />
        الصفحة الرئيسية
      </Link>

      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col items-center justify-center">
        <Link to="/" aria-label="العودة إلى الصفحة الرئيسية">
          <img src={logo} alt="أكاديمية بنان" className="mx-auto h-28 brightness-0 invert md:h-32" />
        </Link>

        <div className="mb-10 mt-3 text-center text-white">
          <h1 className="text-3xl font-cairo font-bold">إنشاء حساب</h1>
          <p className="mt-2 text-sm text-white/60 font-tajawal">اختر نوع الحساب المناسب لك للمتابعة</p>
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
                    ابدأ الآن
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/55 font-tajawal">
          لديك حساب بالفعل؟{" "}
          <Link className="font-semibold text-secondary hover:underline" to="/portal/login">
            سجّل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
};

export default AccountTypeSelect;
