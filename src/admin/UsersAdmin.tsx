import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { adminUsersApi, type AdminUser, type AdminUserRole } from "@/api/adminUsersApi";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const roleLabels: Record<AdminUserRole, string> = {
  student: "طالب",
  parent: "ولي أمر",
  teacher: "معلم",
  supervisor: "مشرف",
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
}

export default function UsersAdmin({ title, description, roles }: UsersAdminProps) {
  const rolesKey = roles.join(",");
  const [role, setRole] = useState<AdminUserRole | "all">(roles.length === 1 ? roles[0] : "all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState<number>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
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
  }, [page, role, rolesKey, title]);

  useEffect(() => { load(); }, [load]);

  const openDetails = async (item: AdminUser) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const result = await adminUsersApi.get(item.id);
      setSelected(result.data);
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

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold font-cairo">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {roles.length > 1 && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={role === "all" ? "default" : "outline"} onClick={() => changeRole("all")}>الكل</Button>
        {roles.map((value) => <Button key={value} size="sm" variant={role === value ? "default" : "outline"} onClick={() => changeRole(value)}>{roleLabels[value]}</Button>)}
      </div>}

      <Card><CardContent className="p-0">
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">لا توجد بيانات للعرض</div>
        ) : <Table>
          <TableHeader><TableRow><TableHead className="text-right">الاسم</TableHead><TableHead className="text-right">التواصل</TableHead><TableHead className="text-right">الدور</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">تاريخ التسجيل</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}>
            <TableCell className="font-semibold">{item.fullName || "بدون اسم"}</TableCell>
            <TableCell><p className="flex items-center gap-1" dir="ltr"><Mail className="h-3.5 w-3.5" />{item.email || "—"}</p><p className="mt-1 flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{item.phone || "—"}</p></TableCell>
            <TableCell><Badge variant="outline">{roleLabels[item.role] || item.role}</Badge></TableCell>
            <TableCell><Badge variant={item.status === "blocked" ? "destructive" : item.status === "active" ? "default" : "secondary"}>{statusLabels[item.status || ""] || item.status || "—"}</Badge></TableCell>
            <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : "—"}</TableCell>
            <TableCell><Button size="sm" variant="outline" className="gap-1" onClick={() => openDetails(item)}><Eye className="h-4 w-4" />عرض التفاصيل</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">صفحة {page}{total !== undefined ? ` — إجمالي ${total}` : ""}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronRight className="h-4 w-4" />السابق</Button><Button size="sm" variant="outline" disabled={!hasNextPage || loading} onClick={() => setPage((value) => value + 1)}>التالي<ChevronLeft className="h-4 w-4" /></Button></div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent dir="rtl"><DialogHeader><DialogTitle className="font-cairo">بيانات {selected?.fullName || "المستخدم"}</DialogTitle><DialogDescription>تفاصيل الحساب المسجلة في النظام.</DialogDescription></DialogHeader>
          {detailLoading || !selected ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="grid gap-3 sm:grid-cols-2"><Detail label="الاسم" value={selected.fullName} /><Detail label="الدور" value={roleLabels[selected.role]} /><Detail label="البريد الإلكتروني" value={selected.email} /><Detail label="رقم الهاتف" value={selected.phone} /><Detail label="الحالة" value={statusLabels[selected.status || ""] || selected.status} /><Detail label="البريد مفعّل" value={selected.isVerified === undefined ? "—" : selected.isVerified ? "نعم" : "لا"} /><Detail label="تاريخ التسجيل" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString("ar-SA") : "—"} /><Detail label="آخر تحديث" value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString("ar-SA") : "—"} /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
