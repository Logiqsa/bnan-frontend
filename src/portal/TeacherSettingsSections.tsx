import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, RefreshCw, Save, Smartphone, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/authApi";
import { ApiError } from "@/api/client";
import {
  teacherPayoutProfileApi,
  type TeacherPayoutMethod,
  type TeacherPayoutProfile,
  type TeacherPayoutProfileInput,
} from "@/api/teacherPayoutProfileApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

const phoneQueryKey = ["teacher-settings-profile"] as const;
const payoutProfileQueryKey = ["teacher-payout-profile"] as const;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message || fallback : fallback;

const profilePhone = (response: { data: unknown } | undefined) => {
  if (!response?.data || typeof response.data !== "object") return "";
  const phone = (response.data as Record<string, unknown>).phone;
  return typeof phone === "string" ? phone : "";
};

export const TeacherPhoneSettings = () => {
  const { pick } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const profile = useQuery({
    queryKey: phoneQueryKey,
    queryFn: authApi.profile,
    staleTime: 60_000,
    retry: 1,
  });
  const currentPhone = savedPhone ?? profilePhone(profile.data);
  const updatePhone = useMutation({
    mutationFn: authApi.updatePhone,
    onSuccess: (response, phone) => {
      const updatedPhone = response.data?.phone?.trim() || phone;
      setSavedPhone(updatedPhone);
      setDraft(updatedPhone);
      setEditing(false);
      setFormError("");
      toast.success(pick("تم تحديث رقم الهاتف.", "Phone number updated."));
    },
    onError: (error) => {
      const message = errorMessage(
        error,
        pick("تعذر تحديث رقم الهاتف.", "Unable to update phone number."),
      );
      setFormError(message);
      toast.error(message);
    },
  });

  const beginEditing = () => {
    setDraft(currentPhone);
    setFormError("");
    setEditing(true);
  };

  const save = () => {
    const phone = draft.trim();
    setFormError("");
    if (!phone) {
      setFormError(pick("رقم الهاتف مطلوب.", "Phone number is required."));
      return;
    }
    if (phone === currentPhone) {
      setEditing(false);
      return;
    }
    updatePhone.mutate(phone);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          {pick("رقم الهاتف", "Phone number")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.isPending ? (
          <div className="space-y-2" aria-label={pick("جاري تحميل رقم الهاتف", "Loading phone number")}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-28" />
          </div>
        ) : profile.isError ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-destructive">
              {pick("تعذر تحميل رقم الهاتف.", "Unable to load phone number.")}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
              <RefreshCw className={`me-2 h-4 w-4 ${profile.isFetching ? "animate-spin" : ""}`} />
              {pick("إعادة المحاولة", "Retry")}
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="teacher-settings-phone">{pick("رقم الهاتف", "Phone number")}</Label>
              <Input
                id="teacher-settings-phone"
                type="tel"
                dir="ltr"
                className="text-left"
                autoComplete="tel"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={updatePhone.isPending}
              />
            </div>
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={save} disabled={updatePhone.isPending}>
                {updatePhone.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                {pick("حفظ رقم الهاتف", "Save phone number")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={updatePhone.isPending}>
                <X className="me-2 h-4 w-4" />
                {pick("إلغاء", "Cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p dir="ltr" className="break-all text-start font-medium">
              {currentPhone || pick("غير متاح", "Unavailable")}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={beginEditing}>
              <Pencil className="me-2 h-4 w-4" />
              {pick("تعديل", "Edit")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const emptyPayoutForm = (): TeacherPayoutProfileInput => ({
  method: "wallet",
  accountHolderName: "",
  walletProvider: "",
  walletPhone: "",
});

const formFromProfile = (profile: TeacherPayoutProfile | null): TeacherPayoutProfileInput =>
  profile
    ? {
        method: profile.method,
        accountHolderName: profile.accountHolderName || "",
        ...(profile.method === "wallet" ? {
          walletProvider: profile.walletProvider || "",
          walletPhone: profile.walletPhone || "",
        } : {}),
        ...(profile.method === "bank_account" ? {
          bankName: profile.bankName || "",
          accountNumber: profile.accountNumber || "",
          iban: profile.iban || "",
        } : {}),
        ...(profile.method === "instapay" ? {
          instapayAddress: profile.instapayAddress || "",
        } : {}),
      }
    : emptyPayoutForm();

const maskedValue = (value?: string) => {
  if (!value) return "";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
};

export const TeacherPayoutProfileSettings = () => {
  const { pick } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TeacherPayoutProfileInput>(emptyPayoutForm);
  const [formError, setFormError] = useState("");
  const profile = useQuery({
    queryKey: payoutProfileQueryKey,
    queryFn: teacherPayoutProfileApi.get,
    staleTime: 60_000,
    retry: 1,
  });
  const saveProfile = useMutation({
    mutationFn: teacherPayoutProfileApi.update,
    onSuccess: (saved) => {
      queryClient.setQueryData(payoutProfileQueryKey, saved);
      setEditing(false);
      setFormError("");
      toast.success(pick("تم حفظ بيانات استلام المستحقات.", "Payout profile saved."));
    },
    onError: (error) => {
      const message = errorMessage(
        error,
        pick("تعذر حفظ بيانات الاستلام.", "Unable to save payout profile."),
      );
      setFormError(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!editing) setForm(formFromProfile(profile.data ?? null));
  }, [editing, profile.data]);

  const beginEditing = () => {
    setForm(formFromProfile(profile.data ?? null));
    setFormError("");
    setEditing(true);
  };

  const updateMethod = (method: TeacherPayoutMethod) => {
    setForm({
      method,
      accountHolderName: form.accountHolderName,
      ...(method === "wallet" ? { walletProvider: "", walletPhone: "" } : {}),
      ...(method === "bank_account" ? { bankName: "", accountNumber: "", iban: "" } : {}),
      ...(method === "instapay" ? { instapayAddress: "" } : {}),
    });
  };

  const save = () => {
    const accountHolderName = form.accountHolderName.trim();
    let body: TeacherPayoutProfileInput;
    setFormError("");
    if (!accountHolderName) {
      setFormError(pick("اسم صاحب الحساب مطلوب.", "Account holder name is required."));
      return;
    }
    if (form.method === "wallet") {
      const walletProvider = form.walletProvider?.trim() || "";
      const walletPhone = form.walletPhone?.trim() || "";
      if (!walletProvider || !walletPhone) {
        setFormError(pick("بيانات المحفظة مطلوبة.", "Wallet provider and phone are required."));
        return;
      }
      body = { method: "wallet", accountHolderName, walletProvider, walletPhone };
    } else if (form.method === "bank_account") {
      const bankName = form.bankName?.trim() || "";
      const accountNumber = form.accountNumber?.trim() || "";
      const iban = form.iban?.trim() || "";
      if (!bankName || (!accountNumber && !iban)) {
        setFormError(pick("اسم البنك ورقم الحساب أو IBAN مطلوبان.", "Bank name and an account number or IBAN are required."));
        return;
      }
      body = {
        method: "bank_account",
        accountHolderName,
        bankName,
        ...(accountNumber ? { accountNumber } : {}),
        ...(iban ? { iban } : {}),
      };
    } else {
      const instapayAddress = form.instapayAddress?.trim() || "";
      if (!instapayAddress) {
        setFormError(pick("عنوان Instapay مطلوب.", "Instapay address is required."));
        return;
      }
      body = { method: "instapay", accountHolderName, instapayAddress };
    }
    saveProfile.mutate(body);
  };

  const methodLabel = (method: TeacherPayoutMethod) => ({
    wallet: pick("محفظة إلكترونية", "Mobile wallet"),
    bank_account: pick("حساب بنكي", "Bank account"),
    instapay: "Instapay",
  })[method];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-primary" />
          {pick("بيانات استلام المستحقات", "Payout profile")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.isPending ? (
          <div className="space-y-3" aria-label={pick("جاري تحميل بيانات الاستلام", "Loading payout profile")}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : profile.isError ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-destructive">{pick("تعذر تحميل بيانات الاستلام.", "Unable to load payout profile.")}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
              <RefreshCw className={`me-2 h-4 w-4 ${profile.isFetching ? "animate-spin" : ""}`} />
              {pick("إعادة المحاولة", "Retry")}
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payout-method">{pick("طريقة الاستلام", "Payout method")}</Label>
              <select
                id="payout-method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.method}
                onChange={(event) => updateMethod(event.target.value as TeacherPayoutMethod)}
                disabled={saveProfile.isPending}
              >
                <option value="wallet">{pick("محفظة إلكترونية", "Mobile wallet")}</option>
                <option value="bank_account">{pick("حساب بنكي", "Bank account")}</option>
                <option value="instapay">Instapay</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-holder">{pick("اسم صاحب الحساب", "Account holder name")}</Label>
              <Input id="payout-holder" value={form.accountHolderName} onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))} disabled={saveProfile.isPending} />
            </div>
            {form.method === "wallet" && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="wallet-provider">{pick("مزود المحفظة", "Wallet provider")}</Label><Input id="wallet-provider" value={form.walletProvider || ""} onChange={(event) => setForm((current) => ({ ...current, walletProvider: event.target.value }))} disabled={saveProfile.isPending} /></div>
              <div className="space-y-2"><Label htmlFor="wallet-phone">{pick("رقم المحفظة", "Wallet phone")}</Label><Input id="wallet-phone" type="tel" dir="ltr" className="text-left" value={form.walletPhone || ""} onChange={(event) => setForm((current) => ({ ...current, walletPhone: event.target.value }))} disabled={saveProfile.isPending} /></div>
            </div>}
            {form.method === "bank_account" && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="bank-name">{pick("اسم البنك", "Bank name")}</Label><Input id="bank-name" value={form.bankName || ""} onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} disabled={saveProfile.isPending} /></div>
              <div className="space-y-2"><Label htmlFor="account-number">{pick("رقم الحساب", "Account number")}</Label><Input id="account-number" dir="ltr" className="text-left" value={form.accountNumber || ""} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} disabled={saveProfile.isPending} /></div>
              <div className="space-y-2"><Label htmlFor="iban">IBAN</Label><Input id="iban" dir="ltr" className="text-left" value={form.iban || ""} onChange={(event) => setForm((current) => ({ ...current, iban: event.target.value }))} disabled={saveProfile.isPending} /></div>
            </div>}
            {form.method === "instapay" && <div className="space-y-2"><Label htmlFor="instapay-address">{pick("عنوان Instapay", "Instapay address")}</Label><Input id="instapay-address" dir="ltr" className="text-left" value={form.instapayAddress || ""} onChange={(event) => setForm((current) => ({ ...current, instapayAddress: event.target.value }))} disabled={saveProfile.isPending} /></div>}
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={save} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                {pick("حفظ بيانات الاستلام", "Save payout profile")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saveProfile.isPending}>
                <X className="me-2 h-4 w-4" />
                {pick("إلغاء", "Cancel")}
              </Button>
            </div>
          </div>
        ) : profile.data ? (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("طريقة الاستلام", "Payout method")}</dt><dd className="mt-1 font-semibold">{methodLabel(profile.data.method)}</dd></div>
              <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("اسم صاحب الحساب", "Account holder name")}</dt><dd className="mt-1 break-words font-semibold">{profile.data.accountHolderName}</dd></div>
              {profile.data.walletProvider && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("مزود المحفظة", "Wallet provider")}</dt><dd className="mt-1 break-words font-semibold">{profile.data.walletProvider}</dd></div>}
              {profile.data.walletPhone && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("رقم المحفظة", "Wallet phone")}</dt><dd dir="ltr" className="mt-1 text-start font-semibold">{maskedValue(profile.data.walletPhone)}</dd></div>}
              {profile.data.bankName && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("اسم البنك", "Bank name")}</dt><dd className="mt-1 break-words font-semibold">{profile.data.bankName}</dd></div>}
              {profile.data.accountNumber && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("رقم الحساب", "Account number")}</dt><dd dir="ltr" className="mt-1 text-start font-semibold">{maskedValue(profile.data.accountNumber)}</dd></div>}
              {profile.data.iban && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">IBAN</dt><dd dir="ltr" className="mt-1 break-all text-start font-semibold">{maskedValue(profile.data.iban)}</dd></div>}
              {profile.data.instapayAddress && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("عنوان Instapay", "Instapay address")}</dt><dd dir="ltr" className="mt-1 break-all text-start font-semibold">{profile.data.instapayAddress}</dd></div>}
            </dl>
            <Button type="button" size="sm" variant="outline" onClick={beginEditing}><Pencil className="me-2 h-4 w-4" />{pick("تعديل البيانات", "Edit profile")}</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">{pick("لم يتم إعداد بيانات استلام المستحقات بعد.", "Your payout profile has not been configured yet.")}</p>
            <Button type="button" className="mt-4" onClick={beginEditing}>{pick("إضافة بيانات الاستلام", "Add payout profile")}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
