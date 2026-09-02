import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, Mail, MoreHorizontal, PauseCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi, type AdminUser, type AdminUserRole, type AdminUserStatus } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { teacherApplicationsApi, type TeacherApplication } from "@/api/teacherApplicationsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeacherApplicationDetails } from "./TeacherApplicationDetails";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const roleLabels: Record<AdminUserRole, string> = {
  student: "طالب",
  parent: "ولي أمر",
  teacher: "معلم",
  supervisor: "مشرف",
  admin: "أدمن",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  blocked: "محظور",
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium">{value || "—"}</p>
  </div>
);

interface UsersAdminProps {
  title: string;
  description: string;
  roles: AdminUserRole[];
  headerAction?: ReactNode;
  refreshKey?: number;
}

export default function UsersAdmin({ title, description, roles, headerAction, refreshKey }: UsersAdminProps) {
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
      toast.error((error as ApiError).message || `تعذر تحميل ${title}`);
    } finally {
      setLoading(false);
    }
  }, [page, role, rolesKey, title, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const openDetails = async (item: AdminUser) => {
    if (!item.id) {
      toast.error("معرّف المستخدم غير موجود في استجابة الخادم");
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
        setSelected(userResult.data);
        setTeacherDetails(teacherResult?.data ?? null);
        setTeacherDetailsMissing(!teacherResult);
      } else {
        const result = await adminUsersApi.get(item.id);
        setSelected(result.data);
      }
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تحميل بيانات المستخدم");
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
      toast.success(`تم تغيير حالة ${item.fullName || "المستخدم"} إلى ${statusLabels[status]}`);
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر تغيير حالة المستخدم");
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
      toast.success(`تم حذف ${item.fullName || "المستخدم"}`);
    } catch (error) {
      toast.error((error as ApiError).message || "تعذر حذف المستخدم");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold font-cairo">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p></div>
        {headerAction}
      </div>

      {roles.length > 1 && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={role === "all" ? "default" : "outline"} onClick={() => changeRole("all")}>الكل</Button>
        {roles.map((value) => <Button key={value} size="sm" variant={role === value ? "default" : "outline"} onClick={() => changeRole(value)}>{roleLabels[value]}</Button>)}
      </div>}

      <Card><CardContent className="p-0">
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">لا توجد بيانات للعرض</div>
        ) : <Table>
          <TableHeader><TableRow><TableHead className="text-right">الاسم</TableHead><TableHead className="text-right">التواصل</TableHead><TableHead className="text-right">الدور</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">تاريخ التسجيل</TableHead><TableHead className="text-right">الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}>
            <TableCell className="font-semibold">{item.fullName || "بدون اسم"}</TableCell>
            <TableCell><p className="flex items-center gap-1" dir="ltr"><Mail className="h-3.5 w-3.5" />{item.email || "—"}</p><p className="mt-1 flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{item.phone || "—"}</p></TableCell>
            <TableCell><Badge variant="outline">{roleLabels[item.role] || item.role}</Badge></TableCell>
            <TableCell><Badge variant={item.status === "blocked" ? "destructive" : item.status === "active" ? "default" : "secondary"}>{statusLabels[item.status || ""] || item.status || "—"}</Badge></TableCell>
            <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA-u-ca-gregory") : "—"}</TableCell>
            <TableCell><div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />عرض</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="outline" disabled={busyUserId === item.id} aria-label={`إجراءات ${item.fullName || "المستخدم"}`}>{busyUserId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" dir="rtl">
                  <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                  <DropdownMenuItem disabled={item.status === "active"} onClick={() => updateStatus(item, "active")} className="gap-2"><CheckCircle2 className="h-4 w-4" />تنشيط</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "inactive"} onClick={() => updateStatus(item, "inactive")} className="gap-2"><PauseCircle className="h-4 w-4" />تعطيل</DropdownMenuItem>
                  <DropdownMenuItem disabled={item.status === "blocked"} onClick={() => updateStatus(item, "blocked")} className="gap-2"><Ban className="h-4 w-4" />حظر</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUserToDelete(item)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />حذف المستخدم</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">صفحة {page}{total !== undefined ? ` — إجمالي ${total}` : ""}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronRight className="h-4 w-4" />السابق</Button><Button size="sm" variant="outline" disabled={!hasNextPage || loading} onClick={() => setPage((value) => value + 1)}>التالي<ChevronLeft className="h-4 w-4" /></Button></div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setTeacherDetails(null); setTeacherDetailsMissing(false); } }}>
        <DialogContent className={selected?.role === "teacher" ? "max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto" : undefined} dir="rtl"><DialogHeader><DialogTitle className="font-cairo">بيانات {selected?.fullName || "المستخدم"}</DialogTitle><DialogDescription>{selected?.role === "teacher" ? "بيانات حساب المعلم وملف التقديم الكامل." : "تفاصيل الحساب المسجلة في النظام."}</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : teacherDetails ? <><section><h3 className="mb-3 font-bold font-cairo">بيانات الحساب</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="الدور" value={roleLabels[selected.role]} /><Detail label="حالة الحساب" value={statusLabels[selected.status || ""] || selected.status} /><Detail label="تاريخ التسجيل" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString("ar-SA-u-ca-gregory") : "—"} /></div></section><TeacherApplicationDetails application={teacherDetails} /></> : <>{teacherDetailsMissing && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">لا يوجد طلب تقديم مرتبط بحساب هذا المعلم.</div>}<div className="grid gap-3 sm:grid-cols-2"><Detail label="الاسم" value={selected.fullName} /><Detail label="الدور" value={roleLabels[selected.role]} /><Detail label="البريد الإلكتروني" value={selected.email} /><Detail label="رقم الهاتف" value={selected.phone} /><Detail label="الحالة" value={statusLabels[selected.status || ""] || selected.status} /><Detail label="البريد مفعّل" value={selected.isVerified === undefined ? "—" : selected.isVerified ? "نعم" : "لا"} /><Detail label="تاريخ التسجيل" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString("ar-SA-u-ca-gregory") : "—"} /><Detail label="آخر تحديث" value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString("ar-SA-u-ca-gregory") : "—"} /></div></>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && !busyUserId && setUserToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم نهائيًا؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف حساب {userToDelete?.fullName || "هذا المستخدم"}. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyUserId)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={Boolean(busyUserId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{busyUserId ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
