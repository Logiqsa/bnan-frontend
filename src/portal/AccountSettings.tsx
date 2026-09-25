import { useEffect, useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, LockKeyhole, Save, UserRound } from "lucide-react";
import { authApi } from "@/api/authApi";
import { ApiError, tokenStore } from "@/api/client";
import { studentSettingsApi } from "@/api/studentSettingsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "./PortalAuthContext";
import { TeacherPayoutProfileSettings, TeacherPhoneSettings } from "./TeacherSettingsSections";

type VerificationAction = "name" | "password";

const PasswordInput = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) => {
  const [visible, setVisible] = useState(false);
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={visible ? "text" : "password"} dir="ltr" autoComplete={id === "current-password" ? "current-password" : "new-password"} value={value} onChange={(event) => onChange(event.target.value)} className="pl-10"/><button type="button" onClick={() => setVisible((current) => !current)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>;
};

const messageFor = (error: ApiError, fallback: string) => {
  if (error.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  if (["INCORRECT_PASSWORD", "INVALID_CURRENT_PASSWORD"].includes(error.code)) return "كلمة المرور الحالية غير صحيحة.";
  if (error.code === "INVALID_PARENT_CREDENTIALS") return "كلمة مرور ولي الأمر غير صحيحة.";
  if (["SETTINGS_VERIFICATION_REQUIRED", "INVALID_OR_EXPIRED_SETTINGS_VERIFICATION"].includes(error.code)) return "انتهت صلاحية التحقق. أدخل كلمة مرور ولي الأمر مرة أخرى.";
  return error.message || fallback;
};

export default function AccountSettings() {
  const { user, updateCurrentUser } = usePortalAuth();
  const isStudent = user?.role === "student";
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [parentEmail, setParentEmail] = useState(user?.parentEmail || "");
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
  const [verificationAction, setVerificationAction] = useState<VerificationAction | null>(null);
  const [parentPassword, setParentPassword] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    setFullName(user?.fullName || "");
    if (user?.parentEmail !== undefined) setParentEmail(user.parentEmail || "");
  }, [user?.fullName, user?.parentEmail]);

  useEffect(() => {
    if (!isStudent) return;
    void authApi.profile().then((response) => {
      const profile = response.data as { parentEmail?: string | null; fullName?: string };
      if (profile.fullName) setFullName(profile.fullName);
      if (profile.parentEmail !== undefined) setParentEmail(profile.parentEmail || "");
    }).catch(() => undefined);
  }, [isStudent]);

  const openVerification = (action: VerificationAction) => {
    setVerificationError("");
    setParentPassword("");
    setVerificationAction(action);
  };

  const saveName = async () => {
    const value = fullName.trim();
    setNameMessage(""); setNameError("");
    if (value.length < 3) return setNameError("الاسم يجب أن يحتوي على 3 أحرف على الأقل.");
    if (value === user?.fullName) return setNameMessage("لا توجد تغييرات لحفظها.");
    if (isStudent) return openVerification("name");
    setNameBusy(true);
    try { await authApi.updateName(value); updateCurrentUser({ fullName: value }); setNameMessage("تم تحديث الاسم بنجاح."); }
    catch (caught) { setNameError(messageFor(caught as ApiError, "تعذر تحديث الاسم.")); }
    finally { setNameBusy(false); }
  };

  const savePassword = async () => {
    setPasswordMessage(""); setPasswordError("");
    if (!isStudent && !currentPassword) return setPasswordError("أدخل كلمة المرور الحالية.");
    if (updatedPassword.length < 8) return setPasswordError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
    if (updatedPassword !== confirmPassword) return setPasswordError("تأكيد كلمة المرور غير مطابق.");
    if (isStudent) return openVerification("password");
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

  const confirmParentVerification = async () => {
    if (!verificationAction || !parentPassword) {
      setVerificationError("أدخل كلمة مرور ولي الأمر.");
      return;
    }
    setVerificationBusy(true); setVerificationError("");
    try {
      const { data } = await studentSettingsApi.verifyParentPassword(parentPassword);
      const verificationToken = data.verificationToken;
      setParentPassword("");
      if (verificationAction === "name") {
        setNameBusy(true);
        const value = fullName.trim();
        const response = await studentSettingsApi.updateName(value, verificationToken);
        updateCurrentUser({ fullName: response.data?.fullName || value });
        setNameMessage("تم تحديث الاسم بنجاح.");
        setNameBusy(false);
      } else {
        setPasswordBusy(true);
        const response = await studentSettingsApi.updatePassword(updatedPassword, verificationToken);
        const newToken = response.token || response.data?.token;
        const refreshToken = response.refreshToken || response.data?.refreshToken || tokenStore.getRefresh();
        if (newToken && refreshToken) tokenStore.set(newToken, refreshToken, tokenStore.isPersistent());
        setCurrentPassword(""); setUpdatedPassword(""); setConfirmPassword(""); setPasswordMessage("تم تغيير كلمة المرور بنجاح.");
        setPasswordBusy(false);
      }
      setVerificationAction(null);
    } catch (caught) {
      setParentPassword("");
      setVerificationError(messageFor(caught as ApiError, "تعذر التحقق من كلمة مرور ولي الأمر."));
      setNameBusy(false); setPasswordBusy(false);
    } finally { setVerificationBusy(false); }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-3xl font-bold">إعدادات الحساب</h1><p className="mt-1 text-muted-foreground">إدارة بيانات حسابك وكلمة المرور.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary"/>البيانات الأساسية</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="settings-name">الاسم الكامل</Label><Input id="settings-name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></div><div className="space-y-2"><Label htmlFor="settings-email">البريد الإلكتروني</Label><Input id="settings-email" value={user?.email || ""} readOnly dir="ltr" className="bg-muted/50 text-left"/><p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني حاليًا.</p></div>{isStudent && <div className="space-y-2"><Label htmlFor="settings-parent-email">بريد ولي الأمر</Label><Input id="settings-parent-email" value={parentEmail} readOnly dir="ltr" className="bg-muted/50 text-left"/></div>}{nameError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{nameError}</p>}{nameMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{nameMessage}</p>}<Button onClick={() => void saveName()} disabled={nameBusy} className="gap-2">{nameBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}حفظ الاسم</Button></CardContent></Card>
    {user?.role === "teacher" && <TeacherPhoneSettings />}
    {user?.role === "teacher" && <TeacherPayoutProfileSettings />}
    <Card className="overflow-hidden"><button type="button" onClick={() => setPasswordOpen((current) => !current)} className="flex w-full cursor-pointer items-center justify-between gap-3 p-6 text-start transition-colors hover:bg-muted/40" aria-expanded={passwordOpen}><span className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole className="h-5 w-5 text-primary"/>تغيير كلمة المرور</span><ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${passwordOpen ? "rotate-180" : ""}`}/></button>{passwordOpen && <CardContent className="animate-in slide-in-from-top-2 space-y-5 border-t pt-6 duration-300">{!isStudent && <PasswordInput id="current-password" label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword}/>}<PasswordInput id="new-password" label="كلمة المرور الجديدة" value={updatedPassword} onChange={setUpdatedPassword}/><PasswordInput id="confirm-password" label="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={setConfirmPassword}/>{passwordError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</p>}{passwordMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{passwordMessage}</p>}<Button onClick={() => void savePassword()} disabled={passwordBusy} className="gap-2">{passwordBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <LockKeyhole className="h-4 w-4"/>}تغيير كلمة المرور</Button></CardContent>}</Card>
    <Dialog open={Boolean(verificationAction)} onOpenChange={(open) => { if (!open && !verificationBusy) { setVerificationAction(null); setParentPassword(""); setVerificationError(""); } }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>التحقق من ولي الأمر</DialogTitle><DialogDescription>أدخل كلمة مرور ولي الأمر للمتابعة.</DialogDescription></DialogHeader><PasswordInput id="parent-password" label="كلمة مرور ولي الأمر" value={parentPassword} onChange={setParentPassword}/>{verificationError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{verificationError}</p>}<DialogFooter><Button variant="outline" onClick={() => setVerificationAction(null)} disabled={verificationBusy}>إلغاء</Button><Button onClick={() => void confirmParentVerification()} disabled={verificationBusy}>{verificationBusy && <Loader2 className="h-4 w-4 animate-spin"/>}متابعة</Button></DialogFooter></DialogContent></Dialog>
  </div></DashboardLayout>;
}
