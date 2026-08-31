import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, LockKeyhole, Save, UserRound } from "lucide-react";
import { authApi } from "@/api/authApi";
import { ApiError, tokenStore } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "./PortalAuthContext";

const PasswordInput = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) => {
  const [visible, setVisible] = useState(false);
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={visible ? "text" : "password"} dir="ltr" autoComplete={id === "current-password" ? "current-password" : "new-password"} value={value} onChange={(event) => onChange(event.target.value)} className="pl-10"/><button type="button" onClick={() => setVisible((current) => !current)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>;
};

const messageFor = (error: ApiError, fallback: string) => {
  if (error.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  if (error.code === "INCORRECT_PASSWORD" || error.code === "INVALID_CURRENT_PASSWORD") return "كلمة المرور الحالية غير صحيحة.";
  return error.message || fallback;
};

export default function AccountSettings() {
  const { user, updateCurrentUser } = usePortalAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [updatedPassword, setUpdatedPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const saveName = async () => {
    const value = fullName.trim();
    setNameMessage(""); setNameError("");
    if (value.length < 3) return setNameError("الاسم يجب أن يحتوي على 3 أحرف على الأقل.");
    if (value === user?.fullName) return setNameMessage("لا توجد تغييرات لحفظها.");
    setNameBusy(true);
    try { await authApi.updateName(value); updateCurrentUser({ fullName: value }); setNameMessage("تم تحديث الاسم بنجاح."); }
    catch (caught) { setNameError(messageFor(caught as ApiError, "تعذر تحديث الاسم.")); }
    finally { setNameBusy(false); }
  };

  const savePassword = async () => {
    setPasswordMessage(""); setPasswordError("");
    if (!currentPassword) return setPasswordError("أدخل كلمة المرور الحالية.");
    if (updatedPassword.length < 8) return setPasswordError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
    if (updatedPassword !== confirmPassword) return setPasswordError("تأكيد كلمة المرور غير مطابق.");
    setPasswordBusy(true);
    try {
      const response = await authApi.updatePassword(currentPassword, updatedPassword);
      const newToken = response.token || response.data?.token;
      const refreshToken = response.refreshToken || response.data?.refreshToken || tokenStore.getRefresh();
      if (newToken && refreshToken) tokenStore.set(newToken, refreshToken, tokenStore.isPersistent());
      setCurrentPassword(""); setUpdatedPassword(""); setConfirmPassword(""); setPasswordMessage("تم تغيير كلمة المرور بنجاح.");
    } catch (caught) { setPasswordError(messageFor(caught as ApiError, "تعذر تغيير كلمة المرور.")); }
    finally { setPasswordBusy(false); }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-3xl font-bold">إعدادات الحساب</h1><p className="mt-1 text-muted-foreground">إدارة الاسم وكلمة المرور الخاصة بحسابك.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary"/>البيانات الأساسية</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="settings-name">الاسم الكامل</Label><Input id="settings-name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></div><div className="space-y-2"><Label htmlFor="settings-email">البريد الإلكتروني</Label><Input id="settings-email" value={user?.email || ""} readOnly dir="ltr" className="bg-muted/50 text-left"/><p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني حاليًا.</p></div>{nameError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{nameError}</p>}{nameMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{nameMessage}</p>}<Button onClick={saveName} disabled={nameBusy} className="gap-2">{nameBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}حفظ الاسم</Button></CardContent></Card>
    <Card className="overflow-hidden"><button type="button" onClick={() => setPasswordOpen((current) => !current)} className="flex w-full cursor-pointer items-center justify-between gap-3 p-6 text-start transition-colors hover:bg-muted/40" aria-expanded={passwordOpen}><span className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole className="h-5 w-5 text-primary"/>تغيير كلمة المرور</span><ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${passwordOpen ? "rotate-180" : ""}`}/></button>{passwordOpen && <CardContent className="animate-in slide-in-from-top-2 space-y-5 border-t pt-6 duration-300"><PasswordInput id="current-password" label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword}/><PasswordInput id="new-password" label="كلمة المرور الجديدة" value={updatedPassword} onChange={setUpdatedPassword}/><PasswordInput id="confirm-password" label="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={setConfirmPassword}/>{passwordError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</p>}{passwordMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{passwordMessage}</p>}<Button onClick={savePassword} disabled={passwordBusy} className="gap-2">{passwordBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <LockKeyhole className="h-4 w-4"/>}تغيير كلمة المرور</Button></CardContent>}</Card>
  </div></DashboardLayout>;
}
