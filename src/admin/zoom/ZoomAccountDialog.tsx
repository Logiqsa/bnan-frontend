import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeftRight, ShieldAlert, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  zoomAccountsApi,
  ZOOM_ERROR_MESSAGES,
  type ZoomAccount,
  type CreateZoomAccountPayload,
  type UpdateZoomAccountPayload,
} from "@/api/zoomAccountsApi";
import WebhookInfo from "./WebhookInfo";

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

const ZoomAccountDialog = ({ open, onOpenChange, account, onSaved, onGoToGradeAssignment }: Props) => {
  const isEdit = !!account;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [replaceClientSecret, setReplaceClientSecret] = useState(false);
  const [replaceWebhookSecret, setReplaceWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  // "form" = editable fields. "setup" = Phase 1 done / still pending -- shows
  // the webhook URL + guidance + the Phase 3 "تحقق وفعّل الحساب" action.
  const [view, setView] = useState<"form" | "setup">("form");
  const [setupAccount, setSetupAccount] = useState<ZoomAccount | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<ZoomAccount | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scopeErrorNotice, setScopeErrorNotice] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVerifiedAccount(null);
    setScopeErrorNotice(false);
    setReplaceClientSecret(false);
    setReplaceWebhookSecret(false);
    setJustCreated(false);

    if (account) {
      setForm({
        name: account.name,
        accountId: account.accountId,
        clientId: account.clientId,
        hostEmail: account.hostEmail || "",
        apiBaseUrl: account.apiBaseUrl || "",
        clientSecret: "",
        webhookSecretToken: "",
      });
      if (account.setupStatus !== "ready") {
        setSetupAccount(account);
        setView("setup");
      } else {
        setSetupAccount(null);
        setView("form");
      }
    } else {
      setForm(emptyForm);
      setSetupAccount(null);
      setView("form");
    }
  }, [open, account]);

  const close = () => {
    setForm(emptyForm);
    setSetupAccount(null);
    setVerifiedAccount(null);
    onOpenChange(false);
  };

  const set = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      if (isEdit && account) {
        const payload: UpdateZoomAccountPayload = {};
        if (form.name !== account.name) payload.name = form.name;
        if (form.accountId !== account.accountId) payload.accountId = form.accountId;
        if (form.clientId !== account.clientId) payload.clientId = form.clientId;
        if (form.hostEmail !== (account.hostEmail || "")) payload.hostEmail = form.hostEmail;
        if (form.apiBaseUrl !== (account.apiBaseUrl || "")) payload.apiBaseUrl = form.apiBaseUrl || undefined;
        if (replaceClientSecret && form.clientSecret) payload.clientSecret = form.clientSecret;
        if (replaceWebhookSecret && form.webhookSecretToken) payload.webhookSecretToken = form.webhookSecretToken;

        if (Object.keys(payload).length === 0) {
          toast.info("لا يوجد تغييرات لحفظها");
          setSaving(false);
          return;
        }

        const result = await zoomAccountsApi.updateZoomAccount(account.id, payload);
        toast.success("تم تحديث بيانات حساب Zoom");
        setForm(emptyForm);
        onSaved();
        if (result.data.setupStatus !== "ready") {
          // Still pending -- return to the setup/verify panel instead of closing.
          setSetupAccount(result.data);
          setView("setup");
          setReplaceClientSecret(false);
          setReplaceWebhookSecret(false);
        } else {
          close();
        }
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
        const result = await zoomAccountsApi.createZoomAccount(payload);
        toast.success("تم حفظ حساب Zoom مبدئيًا");
        setForm(emptyForm);
        setJustCreated(true);
        setSetupAccount(result.data);
        setView("setup");
        onSaved();
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر حفظ بيانات حساب Zoom");
    } finally {
      setSaving(false);
    }
  };

  const verifyAndActivate = async () => {
    if (!setupAccount) return;
    setVerifying(true);
    setScopeErrorNotice(false);
    try {
      const result = await zoomAccountsApi.verifyZoomAccount(setupAccount.id);
      toast.success("تم التحقق من حساب Zoom وتفعيله");
      setVerifiedAccount(result.data);
      onSaved();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === "ZOOM_HOST_LOOKUP_SCOPE_REQUIRED") {
        setScopeErrorNotice(true);
      } else {
        toast.error(ZOOM_ERROR_MESSAGES[apiError.code] || apiError.message || "تعذر التحقق من حساب Zoom");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (view === "setup" && setupAccount) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-cairo">
              {verifiedAccount ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  تم التحقق من حساب Zoom وتفعيله
                </>
              ) : justCreated ? (
                "تم حفظ حساب Zoom مبدئيًا"
              ) : (
                "إعداد حساب Zoom لم يكتمل"
              )}
            </DialogTitle>
            <DialogDescription className="font-tajawal">{setupAccount.name}</DialogDescription>
          </DialogHeader>

          {verifiedAccount ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Host User ID</span><span dir="ltr" className="font-mono text-xs">{verifiedAccount.hostUserId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Host Email</span><span dir="ltr" className="font-mono text-xs">{verifiedAccount.hostEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الحالة</span><span className="text-emerald-700 font-semibold">مفعّل</span></div>
            </div>
          ) : (
            <>
              <WebhookInfo webhookUrl={setupAccount.webhookUrl} />

              {scopeErrorNotice && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription className="font-tajawal">
                    أضف Scope التالي في Zoom App ثم أعد التفعيل:
                    <br />
                    <span className="font-mono text-xs">user:read:user:admin</span>
                  </AlertDescription>
                </Alert>
              )}

              <button
                type="button"
                className="text-xs text-primary underline self-start flex items-center gap-1"
                onClick={() => setView("form")}
              >
                <Pencil className="w-3 h-3" />
                تعديل بيانات الحساب
              </button>
            </>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={close}>إغلاق</Button>
            {verifiedAccount ? (
              onGoToGradeAssignment && (
                <Button
                  onClick={() => {
                    close();
                    onGoToGradeAssignment();
                  }}
                  className="gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  ربط هذا الحساب بصف
                </Button>
              )
            ) : (
              <Button onClick={verifyAndActivate} disabled={verifying} className="gap-2">
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifying ? "جاري التحقق من حساب Zoom..." : "تحقق وفعّل الحساب"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
            <Label className="font-cairo">Account ID</Label>
            <Input dir="ltr" value={form.accountId} onChange={(e) => set("accountId")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-cairo">Client ID</Label>
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
                  <span className="text-emerald-700">{account?.hasClientSecret ? "مُعرّف ✓" : "غير مُعرّف"}</span>
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
            <Label className="font-cairo">Host Email</Label>
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
                  <span className="text-emerald-700">{account?.hasWebhookSecret ? "مُعرّف ✓" : "غير مُعرّف"}</span>
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

        {isEdit && account && (
          <div className="pt-2 border-t space-y-2">
            <WebhookInfo webhookUrl={account.webhookUrl} />
            {account.setupStatus !== "ready" && (
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => {
                  setSetupAccount(account);
                  setView("setup");
                }}
              >
                عرض خطوات التفعيل
              </button>
            )}
          </div>
        )}

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
