import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Home, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/api/client";
import { usePortalAuth } from "./PortalAuthContext";
import logo from "@/assets/logo-bnan.png";

const messages:Record<string,string>={INCORRECT_LOGIN_DATA:"البريد الإلكتروني أو كلمة المرور غير صحيحة.",TEACHER_NOT_APPROVED:"طلب المعلم قيد المراجعة ولم تتم الموافقة عليه بعد.",REGISTRATION_PENDING:"طلب التسجيل قيد المراجعة.",ACCOUNT_DEACTIVATED:"هذا الحساب غير نشط. تواصل مع الإدارة."};

export default function PortalLogin(){
  const{user,login}=usePortalAuth();const navigate=useNavigate();
  const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[showPassword,setShowPassword]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState("");
  const homeFor=(role:string)=>role==="admin"?"/admin":`/portal/${role}/schedule`;
  if(user)return <Navigate to={homeFor(user.role)} replace/>;
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError("");try{const account=await login(email.trim(),password);navigate(homeFor(account.role),{replace:true});}catch(value){const apiError=value as ApiError;setError(messages[apiError.code]||apiError.message||"تعذر تسجيل الدخول.");}finally{setBusy(false)}};

  return <main className="relative min-h-screen overflow-hidden bg-hero-gradient px-4 py-16" dir="rtl">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(221_50%_22%/.38),transparent_48%)]"/>
    <Button asChild variant="outline" className="absolute right-4 top-4 md:right-8 md:top-6 z-10 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
      <Link to="/"><Home className="ml-2 h-4 w-4"/>الصفحة الرئيسية</Link>
    </Button>

    <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col items-center justify-center">
      <Link to="/" aria-label="العودة إلى الصفحة الرئيسية"><img src={logo} alt="أكاديمية بنان" className="mx-auto h-28 brightness-0 invert md:h-32"/></Link>
      <div className="mb-7 mt-3 text-center text-white"><h1 className="text-3xl font-bold">مرحبًا بك</h1><p className="mt-2 text-sm text-white/55">سجّل دخولك للوصول إلى جدول حصصك</p></div>

      <Card className="w-full border-white/10 bg-card/95 shadow-2xl"><CardContent className="p-6 md:p-7"><form onSubmit={submit} className="space-y-5">
        {error&&<div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <label className="block text-sm font-medium">البريد الإلكتروني<div className="relative mt-2"><Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input type="email" required autoComplete="email" dir="ltr" placeholder="example@email.com" className="h-12 pr-10 text-left" value={email} onChange={event=>setEmail(event.target.value)}/></div></label>
        <label className="block text-sm font-medium">كلمة المرور<div className="relative mt-2"><Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input type={showPassword?"text":"password"} required autoComplete="current-password" dir="ltr" className="h-12 px-10 text-left" value={password} onChange={event=>setPassword(event.target.value)}/><button type="button" onClick={()=>setShowPassword(value=>!value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" aria-label={showPassword?"إخفاء كلمة المرور":"إظهار كلمة المرور"}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></label>
        <Button disabled={busy} className="h-12 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<LogIn className="h-4 w-4"/>}{busy?"جاري تسجيل الدخول...":"تسجيل الدخول"}</Button>
        <div className="border-t pt-5 text-center text-sm text-muted-foreground">ليس لديك حساب معلم؟ <Link className="font-semibold text-secondary hover:underline" to="/portal/teacher/signup">سجّل الآن</Link></div>
      </form></CardContent></Card>
      <p className="mt-7 text-center text-xs text-white/35">© {new Date().getFullYear()} أكاديمية بنان — جميع الحقوق محفوظة</p>
    </div>
  </main>;
}
