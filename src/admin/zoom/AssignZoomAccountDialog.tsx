import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { zoomAccountsApi, ZOOM_ERROR_MESSAGES, type ZoomAccount, type GradeZoomOption } from "@/api/zoomAccountsApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade: GradeZoomOption | null;
  onAssigned: () => void;
}

const AssignZoomAccountDialog = ({ open, onOpenChange, grade, onAssigned }: Props) => {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(grade?.zoomAccount?.id || "");
    setLoading(true);
    zoomAccountsApi
      .getZoomAccounts()
      .then(({ data }) => setAccounts(data.filter((a) => a.isActive && a.isConfigured)))
      .catch((error) => {
        const apiError = error as ApiError;
        toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "فشل تحميل حسابات Zoom");
      })
      .finally(() => setLoading(false));
  }, [open, grade]);

  const submit = async () => {
    if (!grade || !selected) return;
    setSaving(true);
    try {
      await zoomAccountsApi.assignZoomAccountToGrade(grade.id, selected);
      toast.success("تم ربط حساب Zoom بالصف بنجاح");
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر ربط حساب Zoom بالصف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cairo">ربط حساب Zoom بالصف</DialogTitle>
          <DialogDescription className="font-tajawal">{grade?.name}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">لا توجد حسابات Zoom مفعّلة. أضف حسابًا أولًا من تبويب حسابات زوم.</p>
        ) : (
          <div className="space-y-4">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="اختر حساب Zoom" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span>{account.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="font-tajawal text-xs">
                تغيير حساب Zoom لهذا الصف سيُستخدم عند إنشاء الفصول الجديدة فقط.
                الفصول الحالية ستظل مرتبطة بحساب Zoom الذي أُنشئت به.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={submit} disabled={saving || !selected || accounts.length === 0} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ربط الحساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignZoomAccountDialog;
