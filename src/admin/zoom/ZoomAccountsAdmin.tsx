import { useEffect, useState } from "react";
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
import { Loader2, MoreVertical, Plus, Copy, Pencil, Power, PowerOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { zoomAccountsApi, ZOOM_ERROR_MESSAGES, type ZoomAccount } from "@/api/zoomAccountsApi";
import ZoomAccountDialog from "./ZoomAccountDialog";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};

const ZoomAccountsAdmin = ({ onGoToGradeAssignment }: { onGoToGradeAssignment?: () => void }) => {
  const [items, setItems] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZoomAccount | null>(null);
  const [toDisable, setToDisable] = useState<ZoomAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const copyWebhook = async (account: ZoomAccount) => {
    await navigator.clipboard.writeText(account.webhookUrl);
    toast.success("تم نسخ رابط الـ Webhook");
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

  const verify = async (account: ZoomAccount) => {
    setBusyId(account.id);
    try {
      await zoomAccountsApi.verifyZoomAccount(account.id);
      toast.success("تم التحقق من حساب Zoom وتفعيله");
      load();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === "ZOOM_HOST_LOOKUP_SCOPE_REQUIRED") {
        toast.error("أضف Scope التالي في Zoom App ثم أعد التفعيل: user:read:user:admin");
      } else {
        toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر التحقق من الحساب");
      }
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

  const activeCount = items.filter((i) => i.isActive).length;
  const pendingCount = items.filter((i) => i.setupStatus !== "ready").length;

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
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 max-w-xl">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">إجمالي الحسابات</p>
              <p className="text-2xl font-cairo font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">الحسابات المفعّلة</p>
              <p className="text-2xl font-cairo font-bold text-emerald-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-tajawal">قيد الإعداد</p>
              <p className="text-2xl font-cairo font-bold text-amber-600">{pendingCount}</p>
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
                <TableHead>Host Email</TableHead>
                <TableHead>Account ID</TableHead>
                <TableHead>Host User ID</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>البيانات السرية</TableHead>
                <TableHead>تاريخ التحقق</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-cairo font-medium">{account.name}</TableCell>
                  <TableCell dir="ltr" className="text-left text-sm">{account.hostEmail || "—"}</TableCell>
                  <TableCell dir="ltr" className="text-left text-xs text-muted-foreground">{account.accountId}</TableCell>
                  <TableCell dir="ltr" className="text-left text-xs text-muted-foreground">{account.hostUserId || "—"}</TableCell>
                  <TableCell>
                    {account.setupStatus !== "ready" ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">قيد الإعداد</Badge>
                    ) : (
                      <Badge variant={account.isActive ? "default" : "outline"} className={account.isActive ? "bg-emerald-600 hover:bg-emerald-600" : "text-muted-foreground"}>
                        {account.isActive ? "مفعّل" : "معطّل"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className={account.hasClientSecret ? "text-emerald-700" : "text-muted-foreground"}>
                        Client Secret {account.hasClientSecret ? "✓" : "✗"}
                      </span>
                      <span className={account.hasWebhookSecret ? "text-emerald-700" : "text-muted-foreground"}>
                        Webhook Secret {account.hasWebhookSecret ? "✓" : "✗"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(account.verifiedAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => copyWebhook(account)} title="نسخ رابط الـ Webhook">
                      <Copy className="w-4 h-4" />
                    </Button>
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
                          <DropdownMenuItem onClick={() => openEdit(account)} className="gap-2">
                            <Pencil className="w-4 h-4" />
                            عرض / تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyWebhook(account)} className="gap-2">
                            <Copy className="w-4 h-4" />
                            نسخ رابط Webhook
                          </DropdownMenuItem>
                          {account.setupStatus !== "ready" ? (
                            <DropdownMenuItem onClick={() => verify(account)} className="gap-2">
                              <ShieldCheck className="w-4 h-4" />
                              تحقق وفعّل الحساب
                            </DropdownMenuItem>
                          ) : account.isActive ? (
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
