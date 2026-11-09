import { FormEvent, useState } from "react";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import UsersAdmin from "./UsersAdmin";

type FormState = { fullName: string; email: string; phone: string; password: string; confirmPassword: string };
const initialForm: FormState = { fullName: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function AdminsAdmin() {
  const { pick } = useLanguage();
  const { user } = usePortalAuth();
  const canCreateAdmin = !user?.adminAccess || user.adminAccess === "full";
  const [open, setOpen] = useState(false); const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false); const [refreshKey, setRefreshKey] = useState(0);
  const submit = async (event: FormEvent) => { event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password) return toast.error(pick("الاسم والبريد وكلمة المرور مطلوبة.", "Name, email, and password are required."));
    if (form.password.length < 8) return toast.error(pick("كلمة المرور يجب ألا تقل عن 8 أحرف.", "Password must be at least 8 characters."));
    if (form.password !== form.confirmPassword) return toast.error(pick("كلمتا المرور غير متطابقتين.", "Passwords do not match.")); setSaving(true);
    try { await adminUsersApi.createAdmin({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), adminAccess: "full", adminPermissions: [] }); toast.success(pick("تمت إضافة الأدمن بنجاح.", "Administrator added successfully.")); setForm(initialForm); setOpen(false); setRefreshKey((v) => v + 1); }
    catch (error) { toast.error((error as ApiError).message || pick("تعذر إضافة الأدمن.", "Unable to add the administrator.")); } finally { setSaving(false); }
  };
  return <>
    <UsersAdmin title={pick("الأدمن", "Admins")} description={pick("إنشاء وإدارة حسابات الإدارة.", "Create and manage administrator accounts.")} roles={["admin"]} refreshKey={refreshKey} allowEdit headerAction={canCreateAdmin ? <Button onClick={() => { setForm(initialForm); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4"/>{pick("إضافة أدمن", "Add administrator")}</Button> : undefined}/>
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}><DialogContent className="w-[96vw] sm:max-w-2xl" dir={pick("rtl", "ltr")}><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/>{pick("إضافة أدمن جديد", "Add administrator")}</DialogTitle><DialogDescription>{pick("أدخل بيانات حساب الأدمن الجديد.", "Enter the new administrator account details.")}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label={pick("الاسم الكامل", "Full name")} value={form.fullName} onChange={(fullName) => setForm({...form, fullName})}/><Field label={pick("البريد الإلكتروني", "Email")} value={form.email} type="email" onChange={(email) => setForm({...form, email})}/><Field label={pick("رقم الهاتف (اختياري)", "Phone (optional)")} value={form.phone} required={false} onChange={(phone) => setForm({...form, phone})}/></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label={pick("كلمة المرور", "Password")} value={form.password} type="password" onChange={(password) => setForm({...form, password})}/><Field label={pick("تأكيد كلمة المرور", "Confirm password")} value={form.confirmPassword} type="password" onChange={(confirmPassword) => setForm({...form, confirmPassword})}/></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{pick("إلغاء", "Cancel")}</Button><Button disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}{pick("إضافة الأدمن", "Add administrator")}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </>;
}

function Field({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) { return <div className="space-y-2"><Label>{label}</Label><Input required={required} minLength={type === "password" ? 8 : undefined} type={type} dir={type === "text" ? undefined : "ltr"} value={value} onChange={(event) => onChange(event.target.value)}/></div>; }
