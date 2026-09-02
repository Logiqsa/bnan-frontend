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
import UsersAdmin from "./UsersAdmin";

const initialForm = { fullName: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function AdminsAdmin() {
  const { pick } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password) return toast.error(pick("الاسم والبريد وكلمة المرور مطلوبة.", "Name, email, and password are required."));
    if (form.password.length < 8) return toast.error(pick("كلمة المرور يجب ألا تقل عن 8 أحرف.", "Password must be at least 8 characters."));
    if (form.password !== form.confirmPassword) return toast.error(pick("كلمتا المرور غير متطابقتين.", "Passwords do not match."));
    setSaving(true);
    try {
      await adminUsersApi.createAdmin({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) });
      toast.success(pick("تمت إضافة الأدمن بنجاح.", "Administrator added successfully."));
      setForm(initialForm);
      setOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError.status === 409 || /exist|duplicate|مستخدم/i.test(apiError.message || "")
        ? pick("يوجد حساب مسجل بهذا البريد بالفعل.", "An account with this email already exists.")
        : apiError.message || pick("تعذر إضافة الأدمن.", "Unable to add the administrator.");
      toast.error(message);
    } finally { setSaving(false); }
  };

  return <>
    <UsersAdmin
      title={pick("الأدمنز", "Administrators")}
      description={pick("عرض حسابات الإدارة وإضافة أدمن جديد للنظام.", "View administrator accounts and add a new administrator.")}
      roles={["admin"]}
      refreshKey={refreshKey}
      headerAction={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4"/>{pick("إضافة أدمن", "Add administrator")}</Button>}
    />
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogContent className="sm:max-w-lg" dir={pick("rtl", "ltr")}><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/>{pick("إضافة أدمن جديد", "Add administrator")}</DialogTitle><DialogDescription>{pick("سيتمكن الحساب الجديد من الدخول إلى لوحة الإدارة وإدارة النظام.", "The new account will be able to access the admin dashboard and manage the system.")}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="admin-name">{pick("الاسم الكامل", "Full name")}</Label><Input id="admin-name" required autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)}/></div>
          <div className="space-y-2"><Label htmlFor="admin-email">{pick("البريد الإلكتروني", "Email")}</Label><Input id="admin-email" required type="email" autoComplete="email" dir="ltr" value={form.email} onChange={(event) => update("email", event.target.value)}/></div>
          <div className="space-y-2"><Label htmlFor="admin-phone">{pick("رقم الهاتف (اختياري)", "Phone (optional)")}</Label><Input id="admin-phone" type="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={(event) => update("phone", event.target.value)}/></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="admin-password">{pick("كلمة المرور", "Password")}</Label><Input id="admin-password" required minLength={8} type="password" autoComplete="new-password" dir="ltr" value={form.password} onChange={(event) => update("password", event.target.value)}/></div><div className="space-y-2"><Label htmlFor="admin-password-confirm">{pick("تأكيد كلمة المرور", "Confirm password")}</Label><Input id="admin-password-confirm" required minLength={8} type="password" autoComplete="new-password" dir="ltr" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)}/></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>{pick("إلغاء", "Cancel")}</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}{pick("إضافة الأدمن", "Add administrator")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
