import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Copy, Eye, KeyRound, Loader2, Mail, MessageCircle, MoreHorizontal, PauseCircle, Pencil, Phone, RefreshCw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi, type AdminUser, type AdminUserRole, type AdminUserStatus, type RegenerateVerificationCodeResponse } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { teacherApplicationsApi, type TeacherApplication } from "@/api/teacherApplicationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeacherApplicationDetails } from "./TeacherApplicationDetails";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/i18n/LanguageContext";

const roleLabels: Record<AdminUserRole, { ar: string; en: string }> = {
  student: { ar: "طالب", en: "Student" },
  parent: { ar: "ولي أمر", en: "Parent" },
  teacher: { ar: "معلم", en: "Teacher" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  admin: { ar: "أدمن", en: "Admin" },
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: "نشط", en: "Active" },
  inactive: { ar: "غير نشط", en: "Inactive" },
  blocked: { ar: "محظور", en: "Blocked" },
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium">{value || "—"}</p>
  </div>
);

const mergeUserDetails = (current: AdminUser, details: AdminUser): AdminUser => Object.fromEntries(
  Object.entries({ ...current, ...details }).map(([key, value]) => [key, value ?? current[key as keyof AdminUser]]),
) as unknown as AdminUser;

const whatsappNumberOf = (user: AdminUser) => user.whatsappNumber?.trim() || user.whatsapp?.trim() || user.phone?.trim() || "";

const whatsappHref = (user: AdminUser) => {
  let digits = whatsappNumberOf(user).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("01")) digits = `20${digits.slice(1)}`;
  else if (digits.startsWith("05")) digits = `966${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : "";
};

interface UsersAdminProps {
  title: string;
  description: string;
  roles: AdminUserRole[];
  headerAction?: ReactNode;
  refreshKey?: number;
  allowEdit?: boolean;
}

export default function UsersAdmin({ title, description, roles, headerAction, refreshKey, allowEdit = false }: UsersAdminProps) {
  const { isArabic, pick } = useLanguage();
  const rolesKey = roles.join(",");
  const [role, setRole] = useState<AdminUserRole | "all">(roles.length === 1 ? roles[0] : "all");
  const [showUnverified, setShowUnverified] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState<number>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [teacherDetails, setTeacherDetails] = useState<TeacherApplication | null>(null);
  const [teacherDetailsMissing, setTeacherDetailsMissing] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "" });
  const [otpUser, setOtpUser] = useState<AdminUser | null>(null);
  const [otpResult, setOtpResult] = useState<RegenerateVerificationCodeResponse | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  const load = useCallback(async () => {
    void refreshKey;
    setLoading(true);
    try {
      const result = await adminUsersApi.list(role === "all" ? undefined : role, page, showUnverified ? false : undefined, searchQuery || undefined);
      // The users module deliberately excludes admin/supervisor accounts from
      // the unfiltered "all" response.
      const allowedRoles = rolesKey.split(",") as AdminUserRole[];
      const visibleItems = result.data.filter((item) => allowedRoles.includes(item.role));
      setItems(visibleItems);
      setTotal(result.total);
      setHasNextPage(result.hasNextPage ?? result.data.length === 20);
    } catch (error) {
      setItems([]);
      toast.error((error as ApiError).message || pick(`تعذر تحميل ${title}`, `Unable to load ${title}`));
    } finally {
      setLoading(false);
    }
  }, [page, role, rolesKey, title, refreshKey, pick, showUnverified, searchQuery]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const openDetails = async (item: AdminUser) => {
    if (!item.id) {
      toast.error(pick("معرّف المستخدم غير موجود في استجابة الخادم", "User ID is missing from the server response"));
      return;
    }
    setSelected(item);
    setTeacherDetails(null);
    setTeacherDetailsMissing(false);
    setDetailLoading(true);
    try {
      if (item.role === "teacher") {
        const [userResult, teacherResult] = await Promise.all([
          adminUsersApi.get(item.id),
          teacherApplicationsApi.getByUserId(item.id),
        ]);
        setSelected(mergeUserDetails(item, userResult.data));
        setTeacherDetails(teacherResult?.data ?? null);
        setTeacherDetailsMissing(!teacherResult);
      } else {
        const result = await adminUsersApi.get(item.id);
        setSelected(mergeUserDetails(item, result.data));
      }
    } catch (error) {
      toast.error((error as ApiError).message || pick("تعذر تحميل بيانات المستخدم", "Unable to load user details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeRole = (nextRole: AdminUserRole | "all") => {
    setRole(nextRole);
    setPage(1);
  };

  const updateStatus = async (item: AdminUser, status: AdminUserStatus) => {
    if (item.status === status || busyUserId) return;
    setBusyUserId(item.id);
    try {
      const result = await adminUsersApi.updateStatus(item.id, status);
      const updated = { ...item, ...result.data, status };
      setItems((current) => current.map((user) => user.id === item.id ? updated : user));
      setSelected((current) => current?.id === item.id ? { ...current, ...updated } : current);
      toast.success(pick(`تم تغيير حالة ${item.fullName || "المستخدم"} إلى ${statusLabels[status].ar}`, `${item.fullName || "User"} status changed to ${statusLabels[status].en}`));
    } catch (error) {
      toast.error((error as ApiError).message || pick("تعذر تغيير حالة المستخدم", "Unable to change user status"));
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete || busyUserId) return;
    const item = userToDelete;
    setBusyUserId(item.id);
    try {
      await adminUsersApi.delete(item.id);
      setItems((current) => current.filter((user) => user.id !== item.id));
      setTotal((current) => current === undefined ? current : Math.max(0, current - 1));
      setSelected((current) => current?.id === item.id ? null : current);
      setUserToDelete(null);
      toast.success(pick(`تم حذف ${item.fullName || "المستخدم"}`, `${item.fullName || "User"} has been deleted`));
    } catch (error) {
      toast.error((error as ApiError).message || pick("تعذر حذف المستخدم", "Unable to delete user"));
    } finally {
      setBusyUserId(null);
    }
  };

  const openEdit = (item: AdminUser) => {
    setEditingUser(item);
    setEditForm({ fullName: item.fullName || "", email: item.email || "", phone: item.phone || "" });
  };

  const saveEdit = async () => {
    if (!editingUser || busyUserId) return;
    if (!editForm.fullName.trim() || !editForm.email.trim()) return toast.error(pick("الاسم والبريد الإلكتروني مطلوبان", "Name and email are required"));
    setBusyUserId(editingUser.id);
    try {
      const result = await adminUsersApi.update(editingUser.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
      });
      const updated = mergeUserDetails({ ...editingUser, ...editForm }, result.data);
      setItems((current) => current.map((item) => item.id === editingUser.id ? updated : item));
      setSelected((current) => current?.id === editingUser.id ? mergeUserDetails(current, updated) : current);
      setEditingUser(null);
      toast.success(pick("تم تحديث بيانات الأدمن بنجاح", "Administrator details updated successfully"));
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.status === 409 ? pick("يوجد حساب آخر بهذا البريد الإلكتروني", "Another account already uses this email") : apiError.message || pick("تعذر تحديث البيانات", "Unable to update details"));
    } finally { setBusyUserId(null); }
  };

  const generateVerificationCode = async () => {
    if (!otpUser || otpLoading) return;
    setOtpLoading(true);
    try {
      const result = await adminUsersApi.regenerateVerificationCode(otpUser.id, "Internal account has no mailbox");
      setOtpUser(null);
      setOtpResult(result);
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError.code === "USER_NOT_FOUND"
        ? pick("المستخدم غير موجود", "User not found")
        : apiError.code === "ACCOUNT_ALREADY_VERIFIED"
          ? pick("هذا الحساب مفعّل بالفعل", "This account is already verified")
          : apiError.message || pick("تعذر إنشاء رمز التحقق", "Unable to generate verification code");
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const copyVerificationCode = async () => {
    if (!otpResult) return;
    try {
      await navigator.clipboard.writeText(otpResult.code);
      toast.success(pick("تم نسخ رمز التحقق", "Verification code copied"));
    } catch {
      toast.error(pick("تعذر نسخ رمز التحقق", "Unable to copy verification code"));
    }
  };

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold font-cairo">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p></div>
        <div className="flex flex-wrap gap-2">{headerAction}<Button type="button" variant="outline" className="gap-2" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{pick("تحديث", "Refresh")}</Button></div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        {roles.length > 1 ? <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">{pick("الدور:", "Role:")}</span><Button size="sm" variant={role === "all" ? "default" : "outline"} onClick={() => changeRole("all")}>{pick("الكل", "All")}</Button>
          {roles.map((value) => <Button key={value} size="sm" variant={role === value ? "default" : "outline"} onClick={() => changeRole(value)}>{pick(roleLabels[value].ar, roleLabels[value].en)}</Button>)}
        </div> : <span className="text-sm font-medium">{pick(roleLabels[roles[0]].ar, roleLabels[roles[0]].en)}</span>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-72"><Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} /><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={isArabic ? "pr-9" : "pl-9"} placeholder={pick("ابحث بالاسم", "Search by name")} /></div>
          <label htmlFor="show-unverified-users" className="flex shrink-0 cursor-pointer items-center gap-2 text-sm"><Switch id="show-unverified-users" checked={showUnverified} onCheckedChange={(checked) => { setShowUnverified(checked); setPage(1); }} /><span>{pick("عرض غير الموثقين فقط", "Unverified only")}</span></label>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{pick("لا توجد بيانات للعرض", "No data to display")}</div>
        ) : <div className="w-full overflow-x-auto"><Table className="min-w-[900px]">
          <TableHeader><TableRow><TableHead className="text-center">{pick("الاسم", "Name")}</TableHead><TableHead className="text-center">{pick("التواصل", "Contact")}</TableHead><TableHead className="text-center">{pick("الدور", "Role")}</TableHead><TableHead className="text-center">{pick("الحالة", "Status")}</TableHead><TableHead className="text-center">{pick("تاريخ التسجيل", "Registered at")}</TableHead><TableHead className="text-center">{pick("الإجراءات", "Actions")}</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}>
            <TableCell className="text-center font-semibold">{item.fullName || pick("بدون اسم", "Unnamed")}</TableCell>
            <TableCell className="min-w-64 text-left"><div className="flex w-full flex-col items-start space-y-1.5" dir="ltr">{item.email ? <a href={`mailto:${item.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3.5 w-3.5" />{item.email}</a> : <span>—</span>}{item.phone && <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{item.phone}</a>}</div></TableCell>
            <TableCell className="text-center"><Badge variant="outline">{roleLabels[item.role] ? pick(roleLabels[item.role].ar, roleLabels[item.role].en) : item.role}</Badge></TableCell>
            <TableCell className="text-center"><Badge variant={item.isVerified === false ? "secondary" : item.status === "blocked" ? "destructive" : item.status === "active" ? "default" : "secondary"}>{item.isVerified === false ? pick("لم يتم التحقق", "Unverified") : item.status && statusLabels[item.status] ? pick(statusLabels[item.status].ar, statusLabels[item.status].en) : item.status || "—"}</Badge></TableCell>
            <TableCell className="text-center">{item.createdAt ? new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"}</TableCell>
            <TableCell className="text-center"><div className="flex items-center justify-center gap-2">
              {whatsappHref(item) && <Button size="sm" variant="outline" className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" asChild><a href={whatsappHref(item)} target="_blank" rel="noopener noreferrer" aria-label={pick(`تواصل مع ${item.fullName || "المستخدم"} عبر واتساب`, `Contact ${item.fullName || "user"} on WhatsApp`)}><MessageCircle className="h-4 w-4" />{pick("واتساب", "WhatsApp")}</a></Button>}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />{pick("عرض", "View")}</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="outline" disabled={busyUserId === item.id} aria-label={pick(`إجراءات ${item.fullName || "المستخدم"}`, `Actions for ${item.fullName || "user"}`)}>{busyUserId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" dir={isArabic ? "rtl" : "ltr"}>
                  {item.isVerified === false && <><DropdownMenuItem onClick={() => setOtpUser(item)} className="gap-3"><KeyRound className="h-4 w-4" />{pick("إنشاء رمز تحقق", "Generate Verification OTP")}</DropdownMenuItem><DropdownMenuSeparator /></>}
                  {allowEdit && <><DropdownMenuItem onClick={() => openEdit(item)} className="gap-2"><Pencil className="h-4 w-4" />{pick("تعديل البيانات", "Edit details")}</DropdownMenuItem><DropdownMenuSeparator /></>}
                  <DropdownMenuItem disabled={item.status === "active"} onClick={() => updateStatus(item, "active")} className="gap-3"><CheckCircle2 className="h-4 w-4" />{pick("تنشيط", "Activate")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "inactive"} onClick={() => updateStatus(item, "inactive")} className="gap-3"><PauseCircle className="h-4 w-4" />{pick("تعطيل", "Deactivate")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "blocked"} onClick={() => updateStatus(item, "blocked")} className="gap-3"><Ban className="h-4 w-4" />{pick("حظر", "Block")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUserToDelete(item)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{pick("حذف المستخدم", "Delete user")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table></div>}
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{pick(`صفحة ${page}${total !== undefined ? ` - إجمالي ${total}` : ""}`, `Page ${page}${total !== undefined ? ` - Total ${total}` : ""}`)}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>{isArabic ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{pick("السابق", "Previous")}</Button><Button size="sm" variant="outline" disabled={!hasNextPage || loading} onClick={() => setPage((value) => value + 1)}>{pick("التالي", "Next")}{isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setTeacherDetails(null); setTeacherDetailsMissing(false); } }}>
        <DialogContent className={selected?.role === "teacher" ? "max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto" : undefined} dir={isArabic ? "rtl" : "ltr"}><DialogHeader><DialogTitle className="font-cairo">{pick("بيانات", "Details for")} {selected?.fullName || pick("المستخدم", "user")}</DialogTitle><DialogDescription>{selected?.role === "teacher" ? pick("بيانات حساب المعلم وملف التقديم الكامل.", "Teacher account details and full application profile.") : pick("تفاصيل الحساب المسجلة في النظام.", "Account details registered in the system.")}</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : teacherDetails ? <><section><h3 className="mb-3 font-bold font-cairo">{pick("بيانات الحساب", "Account Details")}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label={pick("الدور", "Role")} value={pick(roleLabels[selected.role].ar, roleLabels[selected.role].en)} /><Detail label={pick("حالة الحساب", "Account status")} value={selected.status && statusLabels[selected.status] ? pick(statusLabels[selected.status].ar, statusLabels[selected.status].en) : selected.status} /><Detail label={pick("تاريخ التسجيل", "Registered at")} value={selected.createdAt ? new Date(selected.createdAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /></div></section><TeacherApplicationDetails application={teacherDetails} /></> : <>{teacherDetailsMissing && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{pick("لا يوجد طلب تقديم مرتبط بحساب هذا المعلم.", "No teacher application is linked to this account.")}</div>}<div className="grid gap-3 sm:grid-cols-2"><Detail label={pick("الاسم", "Name")} value={selected.fullName} /><Detail label={pick("الدور", "Role")} value={pick(roleLabels[selected.role].ar, roleLabels[selected.role].en)} />{selected.role === "student" && <><Detail label={pick("المنهج", "Curriculum")} value={selected.curriculum} /><Detail label={pick("الصف", "Grade")} value={selected.grade} /></>}<Detail label={pick("البريد الإلكتروني", "Email")} value={selected.email} /><Detail label={pick("رقم الهاتف", "Phone")} value={selected.phone} /><Detail label={pick("رقم واتساب", "WhatsApp number")} value={selected.whatsappNumber || selected.whatsapp} /><Detail label={pick("الحالة", "Status")} value={selected.status && statusLabels[selected.status] ? pick(statusLabels[selected.status].ar, statusLabels[selected.status].en) : selected.status} /><Detail label={pick("البريد مفعّل", "Email verified")} value={selected.isVerified === undefined ? "—" : selected.isVerified ? pick("نعم", "Yes") : pick("لا", "No")} /><Detail label={pick("تاريخ التسجيل", "Registered at")} value={selected.createdAt ? new Date(selected.createdAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /><Detail label={pick("آخر تحديث", "Last updated")} value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /></div>{whatsappHref(selected) && <Button className="mt-4 gap-2 bg-emerald-600 text-white hover:bg-emerald-700" asChild><a href={whatsappHref(selected)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />{pick("تواصل عبر واتساب", "Contact on WhatsApp")}</a></Button>}</>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(otpUser)} onOpenChange={(open) => !open && !otpLoading && setOtpUser(null)}>
        <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
          <AlertDialogHeader><AlertDialogTitle>{pick("إنشاء رمز تحقق", "Generate Verification Code")}</AlertDialogTitle><AlertDialogDescription>{pick("سيتم إنشاء رمز تحقق جديد لهذا المستخدم. سيصبح الرمز السابق غير صالح.", "A new verification code will be generated for this user. The previous code will become invalid.")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={otpLoading}>{pick("إلغاء", "Cancel")}</AlertDialogCancel><AlertDialogAction disabled={otpLoading} onClick={(event) => { event.preventDefault(); void generateVerificationCode(); }}>{otpLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}{pick("إنشاء", "Generate")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(otpResult)} onOpenChange={(open) => !open && setOtpResult(null)}>
        <DialogContent dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{pick("رمز التحقق", "Verification Code")}</DialogTitle><DialogDescription>{pick("انسخ الرمز وشاركه بأمان مع المستخدم المقصود.", "Copy the code and share it securely with the intended user.")}</DialogDescription></DialogHeader>
          {otpResult && <div className="space-y-4"><div className="rounded-xl border bg-muted/30 p-5 text-center"><p className="font-mono text-4xl font-bold tracking-[0.3em]" dir="ltr">{otpResult.code}</p></div><div><p className="text-xs text-muted-foreground">{pick("ينتهي في:", "Expires at:")}</p><p className="font-medium">{new Date(otpResult.expiresAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p></div><div role="alert" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{pick("هذا الرمز حساس. شاركه فقط مع المستخدم المقصود.", "This code is sensitive. Share it only with the intended user.")}</span></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setOtpResult(null)}>{pick("إغلاق", "Close")}</Button><Button className="gap-2" onClick={() => void copyVerificationCode()}><Copy className="h-4 w-4" />{pick("نسخ الرمز", "Copy Code")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && !busyUserId && setEditingUser(null)}>
        <DialogContent dir={isArabic ? "rtl" : "ltr"}><DialogHeader><DialogTitle>{pick("تعديل بيانات الأدمن", "Edit Administrator Details")}</DialogTitle><DialogDescription>{pick("يمكنك تعديل الاسم والبريد الإلكتروني ورقم الهاتف.", "You can edit the name, email, and phone number.")}</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor="edit-admin-name">{pick("الاسم الكامل", "Full name")}</Label><Input id="edit-admin-name" value={editForm.fullName} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}/></div><div className="space-y-2"><Label htmlFor="edit-admin-email">{pick("البريد الإلكتروني", "Email")}</Label><Input id="edit-admin-email" type="email" dir="ltr" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}/></div><div className="space-y-2"><Label htmlFor="edit-admin-phone">{pick("رقم الهاتف", "Phone")}</Label><Input id="edit-admin-phone" type="tel" dir="ltr" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}/></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingUser(null)} disabled={Boolean(busyUserId)}>{pick("إلغاء", "Cancel")}</Button><Button onClick={() => void saveEdit()} disabled={Boolean(busyUserId)}>{busyUserId && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}{pick("حفظ التغييرات", "Save changes")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && !busyUserId && setUserToDelete(null)}>
        <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick("حذف المستخدم نهائيًا؟", "Delete user permanently?")}</AlertDialogTitle>
            <AlertDialogDescription>{pick(`سيتم حذف حساب ${userToDelete?.fullName || "هذا المستخدم"}. لا يمكن التراجع عن هذا الإجراء.`, `${userToDelete?.fullName || "This user"} will be deleted. This action cannot be undone.`)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyUserId)}>{pick("إلغاء", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={Boolean(busyUserId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{busyUserId ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}{pick("حذف", "Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
