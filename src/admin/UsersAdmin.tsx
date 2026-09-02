import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, Mail, MoreHorizontal, PauseCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi, type AdminUser, type AdminUserRole, type AdminUserStatus } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { teacherApplicationsApi, type TeacherApplication } from "@/api/teacherApplicationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeacherApplicationDetails } from "./TeacherApplicationDetails";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const load = useCallback(async () => {
    void refreshKey;
    setLoading(true);
    try {
      const result = await adminUsersApi.list(role === "all" ? undefined : role, page);
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
  }, [page, role, rolesKey, title, refreshKey, pick]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold font-cairo">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p></div>
        {headerAction}
      </div>

      {roles.length > 1 && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={role === "all" ? "default" : "outline"} onClick={() => changeRole("all")}>{pick("الكل", "All")}</Button>
        {roles.map((value) => <Button key={value} size="sm" variant={role === value ? "default" : "outline"} onClick={() => changeRole(value)}>{pick(roleLabels[value].ar, roleLabels[value].en)}</Button>)}
      </div>}

      <Card><CardContent className="p-0">
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{pick("لا توجد بيانات للعرض", "No data to display")}</div>
        ) : <div className="w-full overflow-x-auto"><Table className="min-w-[760px]">
          <TableHeader><TableRow><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("الاسم", "Name")}</TableHead><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("التواصل", "Contact")}</TableHead><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("الدور", "Role")}</TableHead><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("الحالة", "Status")}</TableHead><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("تاريخ التسجيل", "Registered at")}</TableHead><TableHead className={isArabic ? "text-right" : "text-left"}>{pick("الإجراءات", "Actions")}</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}>
            <TableCell className="font-semibold">{item.fullName || pick("بدون اسم", "Unnamed")}</TableCell>
            <TableCell><p className="flex items-center gap-1" dir="ltr"><Mail className="h-3.5 w-3.5" />{item.email || "—"}</p><p className="mt-1 flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{item.phone || "—"}</p></TableCell>
            <TableCell><Badge variant="outline">{roleLabels[item.role] ? pick(roleLabels[item.role].ar, roleLabels[item.role].en) : item.role}</Badge></TableCell>
            <TableCell><Badge variant={item.status === "blocked" ? "destructive" : item.status === "active" ? "default" : "secondary"}>{item.status && statusLabels[item.status] ? pick(statusLabels[item.status].ar, statusLabels[item.status].en) : item.status || "—"}</Badge></TableCell>
            <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"}</TableCell>
            <TableCell><div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />{pick("عرض", "View")}</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="outline" disabled={busyUserId === item.id} aria-label={pick(`إجراءات ${item.fullName || "المستخدم"}`, `Actions for ${item.fullName || "user"}`)}>{busyUserId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" dir={isArabic ? "rtl" : "ltr"}>
                  <DropdownMenuLabel>{pick("تغيير الحالة", "Change status")}</DropdownMenuLabel>
                  {allowEdit && <><DropdownMenuItem onClick={() => openEdit(item)} className="gap-2"><Pencil className="h-4 w-4" />{pick("تعديل البيانات", "Edit details")}</DropdownMenuItem><DropdownMenuSeparator /></>}
                  <DropdownMenuItem disabled={item.status === "active"} onClick={() => updateStatus(item, "active")} className="gap-2"><CheckCircle2 className="h-4 w-4" />{pick("تنشيط", "Activate")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "inactive"} onClick={() => updateStatus(item, "inactive")} className="gap-2"><PauseCircle className="h-4 w-4" />{pick("تعطيل", "Deactivate")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "blocked"} onClick={() => updateStatus(item, "blocked")} className="gap-2"><Ban className="h-4 w-4" />{pick("حظر", "Block")}</DropdownMenuItem>
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
          {detailLoading || !selected ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : teacherDetails ? <><section><h3 className="mb-3 font-bold font-cairo">{pick("بيانات الحساب", "Account Details")}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label={pick("الدور", "Role")} value={pick(roleLabels[selected.role].ar, roleLabels[selected.role].en)} /><Detail label={pick("حالة الحساب", "Account status")} value={selected.status && statusLabels[selected.status] ? pick(statusLabels[selected.status].ar, statusLabels[selected.status].en) : selected.status} /><Detail label={pick("تاريخ التسجيل", "Registered at")} value={selected.createdAt ? new Date(selected.createdAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /></div></section><TeacherApplicationDetails application={teacherDetails} /></> : <>{teacherDetailsMissing && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{pick("لا يوجد طلب تقديم مرتبط بحساب هذا المعلم.", "No teacher application is linked to this account.")}</div>}<div className="grid gap-3 sm:grid-cols-2"><Detail label={pick("الاسم", "Name")} value={selected.fullName} /><Detail label={pick("الدور", "Role")} value={pick(roleLabels[selected.role].ar, roleLabels[selected.role].en)} /><Detail label={pick("البريد الإلكتروني", "Email")} value={selected.email} /><Detail label={pick("رقم الهاتف", "Phone")} value={selected.phone} /><Detail label={pick("الحالة", "Status")} value={selected.status && statusLabels[selected.status] ? pick(statusLabels[selected.status].ar, statusLabels[selected.status].en) : selected.status} /><Detail label={pick("البريد مفعّل", "Email verified")} value={selected.isVerified === undefined ? "—" : selected.isVerified ? pick("نعم", "Yes") : pick("لا", "No")} /><Detail label={pick("تاريخ التسجيل", "Registered at")} value={selected.createdAt ? new Date(selected.createdAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /><Detail label={pick("آخر تحديث", "Last updated")} value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString(isArabic ? "ar-SA-u-ca-gregory" : "en-US") : "—"} /></div></>}
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
