import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi, type AdminUser } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { ADMIN_PERMISSION_GROUPS, ALL_ADMIN_PERMISSIONS, type AdminPermission, hasAdminPermission } from "@/lib/adminPermissions";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import UsersAdmin from "./UsersAdmin";

type Access = "full" | "custom";
type FormState = { fullName: string; email: string; phone: string; password: string; confirmPassword: string; adminAccess: Access; adminPermissions: AdminPermission[] };
const initialForm: FormState = { fullName: "", email: "", phone: "", password: "", confirmPassword: "", adminAccess: "full", adminPermissions: [] };

function AccessFields({ access, permissions, onAccess, onPermissions, canGrantFull, allowedPermissions }: { access: Access; permissions: AdminPermission[]; onAccess: (v: Access) => void; onPermissions: (v: AdminPermission[]) => void; canGrantFull: boolean; allowedPermissions: AdminPermission[] }) {
  const { pick } = useLanguage();
  const toggle = (key: AdminPermission, checked: boolean) => onPermissions(checked ? [...new Set([...permissions, key])] : permissions.filter((item) => item !== key));
  return <div className="space-y-5 rounded-2xl border bg-muted/10 p-5">
    <div><Label className="text-lg font-bold">{pick("نطاق صلاحيات الأدمن", "Administrator access")}</Label><p className="mt-1 text-sm text-muted-foreground">{pick("الصلاحيات تُطبق على القائمة والصفحات والـ API نفسه.", "Permissions apply to navigation, pages, and the API itself.")}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      {canGrantFull && <button type="button" aria-pressed={access === "full"} onClick={() => onAccess("full")} className={`flex min-h-24 items-start gap-3 rounded-2xl border-2 p-4 text-start transition ${access === "full" ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${access === "full" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{access === "full" && <Check className="h-4 w-4"/>}</span><span><strong className="text-base">{pick("كل الصلاحيات", "Full access")}</strong><p className="mt-1 text-sm text-muted-foreground">{pick("وصول كامل لكل أجزاء الإدارة.", "Access to all administration areas.")}</p></span></button>}
      <button type="button" aria-pressed={access === "custom"} onClick={() => onAccess("custom")} className={`flex min-h-24 items-start gap-3 rounded-2xl border-2 p-4 text-start transition ${access === "custom" ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${access === "custom" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{access === "custom" && <Check className="h-4 w-4"/>}</span><span><strong className="text-base">{pick("صلاحيات محددة", "Custom access")}</strong><p className="mt-1 text-sm text-muted-foreground">{pick("اختيار الأقسام المسموح بها فقط.", "Select only the allowed sections.")}</p></span></button>
    </div>
    {access === "custom" && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{pick(`تم اختيار ${permissions.length} صلاحية`, `${permissions.length} permissions selected`)}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onPermissions(allowedPermissions)}>{pick("تحديد الكل", "Select all")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => onPermissions([])}>{pick("إلغاء الكل", "Clear all")}</Button></div></div><div className="grid gap-3 pe-2 lg:grid-cols-2">{ADMIN_PERMISSION_GROUPS.map((group) => {
      const available = group.permissions.filter((item) => allowedPermissions.includes(item.key)); if (!available.length) return null;
      const allSelected = available.every((item) => permissions.includes(item.key));
      return <section key={group.key} className="rounded-2xl border bg-background p-4"><label className="flex cursor-pointer items-center gap-3 border-b pb-3 font-bold"><Checkbox className="h-5 w-5" checked={allSelected} onCheckedChange={(value) => onPermissions(value ? [...new Set([...permissions, ...available.map((item) => item.key)])] : permissions.filter((key) => !available.some((item) => item.key === key)))} />{pick(group.ar, group.en)}</label><div className="mt-3 grid gap-2">{available.map((item) => <label key={item.key} className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${permissions.includes(item.key) ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/50"}`}><Checkbox className="h-5 w-5" checked={permissions.includes(item.key)} onCheckedChange={(value) => toggle(item.key, Boolean(value))}/>{pick(item.ar, item.en)}</label>)}</div></section>;
    })}</div></div>}
  </div>;
}

export default function AdminsAdmin() {
  const { pick } = useLanguage(); const { user } = usePortalAuth();
  const canGrantFull = !user?.adminAccess || user.adminAccess === "full";
  const allowedPermissions = useMemo(() => ALL_ADMIN_PERMISSIONS.filter((permission) => canGrantFull || hasAdminPermission(user, permission)), [canGrantFull, user]);
  const [open, setOpen] = useState(false); const [form, setForm] = useState<FormState>(initialForm); const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editAccess, setEditAccess] = useState<Access>("custom"); const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]); const [saving, setSaving] = useState(false); const [refreshKey, setRefreshKey] = useState(0);
  const submit = async (event: FormEvent) => { event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password) return toast.error(pick("الاسم والبريد وكلمة المرور مطلوبة.", "Name, email, and password are required."));
    if (form.password.length < 8) return toast.error(pick("كلمة المرور يجب ألا تقل عن 8 أحرف.", "Password must be at least 8 characters."));
    if (form.password !== form.confirmPassword) return toast.error(pick("كلمتا المرور غير متطابقتين.", "Passwords do not match.")); setSaving(true);
    try { await adminUsersApi.createAdmin({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), adminAccess: form.adminAccess, adminPermissions: form.adminAccess === "custom" ? form.adminPermissions : [] }); toast.success(pick("تمت إضافة الأدمن بنجاح.", "Administrator added successfully.")); setForm(initialForm); setOpen(false); setRefreshKey((v) => v + 1); }
    catch (error) { toast.error((error as ApiError).message || pick("تعذر إضافة الأدمن.", "Unable to add the administrator.")); } finally { setSaving(false); }
  };
  const openPermissions = (admin: AdminUser) => { setEditing(admin); setEditAccess(admin.adminAccess || "full"); setEditPermissions((admin.adminPermissions || []).filter((key): key is AdminPermission => ALL_ADMIN_PERMISSIONS.includes(key as AdminPermission))); };
  const savePermissions = async () => { if (!editing) return; setSaving(true); try { await adminUsersApi.updateAdminAccess(editing.id, { adminAccess: editAccess, adminPermissions: editAccess === "custom" ? editPermissions : [] }); toast.success(pick("تم تحديث الصلاحيات.", "Permissions updated.")); setEditing(null); setRefreshKey((v) => v + 1); } catch (error) { toast.error((error as ApiError).message || pick("تعذر تحديث الصلاحيات.", "Unable to update permissions.")); } finally { setSaving(false); } };
  return <>
    <UsersAdmin title={pick("الأدمن", "Admins")} description={pick("إنشاء حسابات الإدارة وتحديد وصول كامل أو صلاحيات دقيقة لكل حساب.", "Create administrators with full or granular access.")} roles={["admin"]} refreshKey={refreshKey} allowEdit onManageAdminAccess={openPermissions} headerAction={<Button onClick={() => { setForm(initialForm); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4"/>{pick("إضافة أدمن", "Add administrator")}</Button>}/>
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}><DialogContent className="max-h-[94vh] w-[96vw] overflow-y-auto sm:max-w-4xl xl:max-w-5xl" dir={pick("rtl", "ltr")}><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/>{pick("إضافة أدمن جديد", "Add administrator")}</DialogTitle><DialogDescription>{pick("أدخل بيانات الحساب وحدد الأقسام التي يستطيع إدارتها.", "Enter account details and select manageable sections.")}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label={pick("الاسم الكامل", "Full name")} value={form.fullName} onChange={(fullName) => setForm({...form, fullName})}/><Field label={pick("البريد الإلكتروني", "Email")} value={form.email} type="email" onChange={(email) => setForm({...form, email})}/><Field label={pick("رقم الهاتف (اختياري)", "Phone (optional)")} value={form.phone} required={false} onChange={(phone) => setForm({...form, phone})}/></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label={pick("كلمة المرور", "Password")} value={form.password} type="password" onChange={(password) => setForm({...form, password})}/><Field label={pick("تأكيد كلمة المرور", "Confirm password")} value={form.confirmPassword} type="password" onChange={(confirmPassword) => setForm({...form, confirmPassword})}/></div>
      <AccessFields access={form.adminAccess} permissions={form.adminPermissions} onAccess={(adminAccess) => setForm({...form, adminAccess})} onPermissions={(adminPermissions) => setForm({...form, adminPermissions})} canGrantFull={canGrantFull} allowedPermissions={allowedPermissions}/><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{pick("إلغاء", "Cancel")}</Button><Button disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}{pick("إضافة الأدمن", "Add administrator")}</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && !saving && setEditing(null)}><DialogContent className="max-h-[94vh] w-[96vw] overflow-y-auto sm:max-w-4xl xl:max-w-5xl" dir={pick("rtl", "ltr")}><DialogHeader><DialogTitle>{pick("صلاحيات", "Permissions for")} {editing?.fullName}</DialogTitle><DialogDescription>{pick("أي تغيير يطبق فورًا على الواجهة والـ API.", "Changes apply immediately to the interface and API.")}</DialogDescription></DialogHeader><AccessFields access={editAccess} permissions={editPermissions} onAccess={setEditAccess} onPermissions={setEditPermissions} canGrantFull={canGrantFull} allowedPermissions={allowedPermissions}/><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>{pick("إلغاء", "Cancel")}</Button><Button onClick={savePermissions} disabled={saving}>{pick("حفظ الصلاحيات", "Save permissions")}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function Field({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) { return <div className="space-y-2"><Label>{label}</Label><Input required={required} minLength={type === "password" ? 8 : undefined} type={type} dir={type === "text" ? undefined : "ltr"} value={value} onChange={(event) => onChange(event.target.value)}/></div>; }
