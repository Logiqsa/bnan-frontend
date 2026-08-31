import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  zoomAccountsApi,
  ZOOM_ERROR_MESSAGES,
  type ZoomAccount,
  type CreateZoomAccountPayload,
  type UpdateZoomAccountPayload,
} from "@/api/zoomAccountsApi";

interface FormState {
  name: string;
  accountId: string;
  clientId: string;
  hostEmail: string;
  apiBaseUrl: string;
  clientSecret: string;
  webhookSecretToken: string;
}

const emptyForm: FormState = {
  name: "",
  accountId: "",
  clientId: "",
  hostEmail: "",
  apiBaseUrl: "",
  clientSecret: "",
  webhookSecretToken: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ZoomAccount | null;
  onSaved: () => void;
  onGoToGradeAssignment?: () => void;
}

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="font-cairo">{label}</Label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          dir="ltr"
          autoComplete="new-password"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label={visible ? "إخفاء" : "إظهار"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const ZoomAccountDialog = ({ open, onOpenChange, account, onSaved }: Props) => {
  const isEdit = !!account;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [replaceClientSecret, setReplaceClientSecret] = useState(false);
  const [replaceWebhookSecret, setReplaceWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReplaceClientSecret(false);
    setReplaceWebhookSecret(false);

    if (account) {
      setForm({
        name: account.name,
        accountId: "",
        clientId: "",
        hostEmail: "",
        apiBaseUrl: "",
        clientSecret: "",
        webhookSecretToken: "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, account]);

  const close = () => {
    setForm(emptyForm);
    onOpenChange(false);
  };

  const set = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      if (isEdit && account) {
        const payload: UpdateZoomAccountPayload = {};
        if (form.name !== account.name) payload.name = form.name;
        if (form.accountId) payload.accountId = form.accountId;
        if (form.clientId) payload.clientId = form.clientId;
        if (form.hostEmail) payload.hostEmail = form.hostEmail;
        if (form.apiBaseUrl) payload.apiBaseUrl = form.apiBaseUrl;
        if (replaceClientSecret && form.clientSecret) payload.clientSecret = form.clientSecret;
        if (replaceWebhookSecret && form.webhookSecretToken) payload.webhookSecretToken = form.webhookSecretToken;

        if (Object.keys(payload).length === 0) {
          toast.info("لا يوجد تغييرات لحفظها");
          setSaving(false);
          return;
        }

        await zoomAccountsApi.updateZoomAccount(account.id, payload);
        toast.success("تم تحديث بيانات حساب Zoom");
        setForm(emptyForm);
        onSaved();
        close();
      } else {
        const payload: CreateZoomAccountPayload = {
          name: form.name,
          accountId: form.accountId,
          clientId: form.clientId,
          clientSecret: form.clientSecret,
          hostEmail: form.hostEmail,
          webhookSecretToken: form.webhookSecretToken,
          ...(form.apiBaseUrl ? { apiBaseUrl: form.apiBaseUrl } : {}),
        };
        await zoomAccountsApi.createZoomAccount(payload);
        toast.success("تم حفظ حساب Zoom");
        setForm(emptyForm);
        onSaved();
        close();
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر حفظ بيانات حساب Zoom");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cairo">{isEdit ? "تعديل حساب Zoom" : "إضافة حساب زوم"}</DialogTitle>
          {isEdit && <DialogDescription className="font-tajawal">تعديل بيانات حساب Zoom الحالي</DialogDescription>}
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-cairo">اسم الحساب</Label>
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Zoom - الصف الأول الابتدائي" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-cairo">Account ID {isEdit && "الجديد (اختياري)"}</Label>
            <Input dir="ltr" value={form.accountId} onChange={(e) => set("accountId")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-cairo">Client ID {isEdit && "الجديد (اختياري)"}</Label>
            <Input dir="ltr" value={form.clientId} onChange={(e) => set("clientId")(e.target.value)} />
          </div>

          {!isEdit && (
            <PasswordField label="Client Secret" value={form.clientSecret} onChange={set("clientSecret")} />
          )}
          {isEdit && (
            <div className="space-y-1.5">
              <Label className="font-cairo">Client Secret</Label>
              {!replaceClientSecret ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-md border bg-muted/40 text-sm">
                  <span className="text-muted-foreground">لن يتم عرض القيمة الحالية</span>
                  <button type="button" className="text-xs text-primary underline" onClick={() => setReplaceClientSecret(true)}>
                    تغيير
                  </button>
                </div>
              ) : (
                <PasswordField label="Client Secret الجديد" value={form.clientSecret} onChange={set("clientSecret")} />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-cairo">Host Email {isEdit && "الجديد (اختياري)"}</Label>
            <Input dir="ltr" type="email" value={form.hostEmail} onChange={(e) => set("hostEmail")(e.target.value)} />
          </div>

          {!isEdit && (
            <PasswordField label="Webhook Secret Token" value={form.webhookSecretToken} onChange={set("webhookSecretToken")} />
          )}
          {isEdit && (
            <div className="space-y-1.5">
              <Label className="font-cairo">Webhook Secret Token</Label>
              {!replaceWebhookSecret ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-md border bg-muted/40 text-sm">
                  <span className="text-muted-foreground">لن يتم عرض القيمة الحالية</span>
                  <button type="button" className="text-xs text-primary underline" onClick={() => setReplaceWebhookSecret(true)}>
                    تغيير
                  </button>
                </div>
              ) : (
                <PasswordField label="Webhook Secret Token الجديد" value={form.webhookSecretToken} onChange={set("webhookSecretToken")} />
              )}
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-cairo text-muted-foreground">API Base URL (اختياري)</Label>
            <Input dir="ltr" value={form.apiBaseUrl} onChange={(e) => set("apiBaseUrl")(e.target.value)} placeholder="https://api.zoom.us/v2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة الحساب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ZoomAccountDialog;
