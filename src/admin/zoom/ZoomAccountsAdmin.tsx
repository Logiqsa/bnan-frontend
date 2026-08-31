import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Loader2, MoreVertical, Plus, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { zoomAccountsApi, ZOOM_ERROR_MESSAGES, type ZoomAccount } from "@/api/zoomAccountsApi";
import ZoomAccountDialog from "./ZoomAccountDialog";
import { getZoomAccountCounters, getZoomAccountStatus } from "./zoomAccountStatus";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG-u-ca-gregory", { year: "numeric", month: "short", day: "numeric" });
};

const ZoomAccountsAdmin = ({ onGoToGradeAssignment }: { onGoToGradeAssignment?: () => void }) => {
  const [items, setItems] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZoomAccount | null>(null);
  const [toDisable, setToDisable] = useState<ZoomAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await zoomAccountsApi.getZoomAccounts();
      setItems(data);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "فشل تحميل حسابات Zoom");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (account: ZoomAccount) => {
    setEditing(account);
    setDialogOpen(true);
  };

  const enable = async (account: ZoomAccount) => {
    setBusyId(account.id);
    try {
      await zoomAccountsApi.updateZoomAccount(account.id, { isActive: true });
      toast.success("تم تفعيل حساب Zoom");
      load();
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر تفعيل الحساب");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDisable = async () => {
    if (!toDisable) return;
    setBusyId(toDisable.id);
    try {
      await zoomAccountsApi.updateZoomAccount(toDisable.id, { isActive: false });
      toast.success("تم تعطيل حساب Zoom");
      load();
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر تعطيل الحساب");
    } finally {
      setBusyId(null);
      setToDisable(null);
    }
  };

  const counters = getZoomAccountCounters(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-cairo font-bold">حسابات زوم</h2>
          <p className="text-muted-foreground font-tajawal text-sm">إدارة حسابات Zoom المستخدمة لإنشاء فصول جديدة</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة حساب زوم
        </Button>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">إجمالي الحسابات</p>
              <p className="text-2xl font-cairo font-bold">{counters.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">الحسابات المفعّلة</p>
              <p className="text-2xl font-cairo font-bold text-emerald-600">{counters.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">جاهزة للاستخدام</p>
              <p className="text-2xl font-cairo font-bold text-emerald-600">{counters.ready}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">قيد الإعداد</p>
              <p className="text-2xl font-cairo font-bold text-amber-600">{counters.pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد حسابات Zoom بعد</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>جاهزية الحساب</TableHead>
                <TableHead>تاريخ الإضافة / آخر تحديث</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-cairo font-medium">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/zoom-accounts/${account.id}/classrooms`)}
                      className="text-start text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {account.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.isActive ? "default" : "outline"} className={account.isActive ? "bg-emerald-600 hover:bg-emerald-600" : "text-muted-foreground"}>
                      {account.isActive ? "مفعّل" : "غير مفعل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getZoomAccountStatus(account) === "ready" ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300">جاهز</Badge>
                    ) : getZoomAccountStatus(account) === "pending" ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">قيد الإعداد</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">غير مفعل</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDate(account.createdAt)}</div>
                    {account.updatedAt && account.updatedAt !== account.createdAt && (
                      <div className="text-xs">آخر تحديث: {formatDate(account.updatedAt)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {busyId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin inline-block" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => navigate(`/admin/zoom-accounts/${account.id}/classrooms`)} className="gap-2">
                            <Eye className="w-4 h-4" />
                            عرض الفصول
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(account)} className="gap-2">
                            <Pencil className="w-4 h-4" />
                            عرض / تعديل
                          </DropdownMenuItem>
                          {account.isActive ? (
                            <DropdownMenuItem onClick={() => setToDisable(account)} className="gap-2 text-destructive focus:text-destructive">
                              <PowerOff className="w-4 h-4" />
                              تعطيل
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => enable(account)} className="gap-2">
                              <Power className="w-4 h-4" />
                              تفعيل
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ZoomAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        onSaved={load}
        onGoToGradeAssignment={onGoToGradeAssignment}
      />

      <AlertDialog open={!!toDisable} onOpenChange={(open) => !open && setToDisable(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل حساب زوم؟</AlertDialogTitle>
            <AlertDialogDescription>
              لن يتم استخدام هذا الحساب لإنشاء فصول جديدة.
              <br />
              الفصول الحالية المرتبطة به لن يتم حذفها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ZoomAccountsAdmin;
