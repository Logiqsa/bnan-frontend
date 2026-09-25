import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { catalogApi, type PackageOption } from "@/api/catalogApi";
import { ApiError } from "@/api/client";
import {
  subscriptionRenewalApi,
  type EgyptianRenewalMethod,
  type EgyptianRenewalRequest,
  type EgyptianRenewalResult,
  type GulfRenewalRequest,
} from "@/api/subscriptionRenewalApi";
import type { GulfPaymentProvider } from "@/api/types";
import { studentHomeApi, studentHomeQueryKey } from "@/api/studentHomeApi";
import {
  studentSubscriptionApi,
  studentSubscriptionsQueryKey,
  type StudentSubscription,
} from "@/api/studentSubscriptionApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";

const studentRenewalPackagesQueryKey = (curriculumId: string) =>
  ["student-renewal-packages", curriculumId] as const;

const getPrivateRenewalContext = (subscription: StudentSubscription) => {
  const accessScope = subscription.accessScope || subscription.package?.accessScope;
  if (accessScope !== "single_subject") return null;
  return {
    subscriptionId: subscription.id || null,
    subjectId: subscription.subject?.id || null,
  };
};

const packageTypeLabel = (item: PackageOption, pick: (ar: string, en: string) => string) =>
  item.type === "hours"
    ? pick("باقة ساعات", "Hours package")
    : item.type === "monthly"
      ? pick("اشتراك شهري", "Monthly subscription")
      : item.type;

const isValidCheckoutUrl = (value: string) => {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const renewalErrorMessage = (reason: unknown, pick: (ar: string, en: string) => string) => {
  if (reason instanceof ApiError) {
    const known: Record<string, string> = {
      SUBSCRIPTION_STILL_ACTIVE: pick("الاشتراك ما زال ساريًا ولا يمكن تجديده الآن.", "The subscription is still active and cannot be renewed yet."),
      RENEWAL_ALREADY_IN_PROGRESS: pick("يوجد طلب تجديد قيد المعالجة بالفعل.", "A renewal request is already in progress."),
      INVALID_PACKAGE_FOR_CURRICULUM: pick("الباقة المختارة لا تتوافق مع منهج الطالب.", "The selected package does not match the student's curriculum."),
      PACKAGE_NOT_FOUND: pick("الباقة المختارة غير متاحة.", "The selected package is unavailable."),
      SUBSCRIPTION_NOT_FOUND: pick("لم يتم العثور على الاشتراك المطلوب.", "The requested subscription was not found."),
      RENEWAL_SUBJECT_MISMATCH: pick("المادة لا تطابق الاشتراك الأصلي.", "The subject does not match the original subscription."),
      EGYPTIAN_STUDENT_ONLY: pick("نظام التجديد المختار غير متاح لهذا الحساب.", "This renewal mode is unavailable for this account."),
      TAMARA_NOT_SUPPORTED: pick("تمارا غير متاحة لهذه الباقة.", "Tamara is unavailable for this package."),
      PAYMOB_NOT_CONFIGURED: pick("الدفع بالبطاقة غير متاح مؤقتًا.", "Card payment is temporarily unavailable."),
    };
    return known[reason.code] || reason.message || pick("تعذر إرسال طلب التجديد.", "Unable to submit the renewal request.");
  }
  return pick("تعذر إرسال طلب التجديد.", "Unable to submit the renewal request.");
};

export default function StudentSubscriptionRenewal() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const { language, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [packageId, setPackageId] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [method, setMethod] = useState<EgyptianRenewalMethod>("other");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [provider, setProvider] = useState<GulfPaymentProvider | "">("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [selectionTouched, setSelectionTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [egyptianResult, setEgyptianResult] = useState<EgyptianRenewalResult | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const submissionLocked = useRef(false);

  const subscriptionsQuery = useQuery({
    queryKey: studentSubscriptionsQueryKey,
    queryFn: studentSubscriptionApi.get,
    staleTime: 60_000,
    retry: 1,
  });
  const homeQuery = useQuery({
    queryKey: studentHomeQueryKey,
    queryFn: studentHomeApi.get,
    staleTime: 60_000,
    retry: 1,
  });
  const subscriptions = useMemo(
    () => subscriptionsQuery.data?.subscriptions.length
      ? subscriptionsQuery.data.subscriptions
      : subscriptionsQuery.data?.subscription
        ? [subscriptionsQuery.data.subscription]
        : [],
    [subscriptionsQuery.data],
  );
  const subscription = useMemo(
    () => subscriptions.find((item) => item.id === subscriptionId),
    [subscriptionId, subscriptions],
  );
  const curriculum = homeQuery.data?.student.curriculum;
  const registrationMode = curriculum?.registrationMode;
  const eligible = subscription?.canRenew === true && subscription.hasPendingRenewal !== true;
  const canLoadPackages = Boolean(
    subscription && eligible && curriculum?.id && (registrationMode === "egyptian" || registrationMode === "gulf"),
  );
  const packagesQuery = useQuery({
    queryKey: studentRenewalPackagesQueryKey(curriculum?.id || "missing"),
    queryFn: () => catalogApi.packages(curriculum!.id),
    enabled: canLoadPackages,
    staleTime: 60_000,
    retry: 1,
  });
  const activePackages = useMemo(
    () => (packagesQuery.data?.data || []).filter((item) => item.isActive === true),
    [packagesQuery.data],
  );
  const privateContext = subscription ? getPrivateRenewalContext(subscription) : null;
  const loading = subscriptionsQuery.isLoading || homeQuery.isLoading;
  const queryError = subscriptionsQuery.isError || homeQuery.isError;

  const retryBaseData = () => {
    if (subscriptionsQuery.isError) void subscriptionsQuery.refetch();
    if (homeQuery.isError) void homeQuery.refetch();
  };

  const invalidateStudentData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: studentSubscriptionsQueryKey }),
      queryClient.invalidateQueries({ queryKey: studentHomeQueryKey }),
    ]);
  };

  const egyptianRenewal = useMutation({
    mutationFn: (body: EgyptianRenewalRequest) => subscriptionRenewalApi.createEgyptianRenewal(body),
    onSuccess: async (result) => {
      submissionLocked.current = false;
      setEgyptianResult(result);
      await invalidateStudentData();
    },
    onError: (reason) => {
      submissionLocked.current = false;
      setFormError(renewalErrorMessage(reason, pick));
    },
  });

  const egyptianStatus = useMutation({
    mutationFn: (paymentId: string) => subscriptionRenewalApi.getEgyptianRenewalStatus(paymentId),
    onSuccess: async (result) => {
      setEgyptianResult(result);
      if (result.status === "completed") await invalidateStudentData();
    },
    onError: (reason) => setFormError(renewalErrorMessage(reason, pick)),
  });

  const gulfRenewal = useMutation({
    mutationFn: ({ body }: { body: GulfRenewalRequest; provider: GulfPaymentProvider }) =>
      subscriptionRenewalApi.createGulfRenewal(body, idempotencyKey),
    onSuccess: (result, variables) => {
      if (!result.paymentId?.trim() || !result.checkoutUrl?.trim() || !isValidCheckoutUrl(result.checkoutUrl)) {
        submissionLocked.current = false;
        setFormError(pick("استجابة الدفع غير مكتملة. لم يتم تحويلك إلى بوابة الدفع.", "The payment response is incomplete. You were not redirected."));
        return;
      }
      gulfPaymentDraftStore.saveRenewal({
        paymentId: result.paymentId,
        provider: variables.provider,
        checkoutUrl: result.checkoutUrl,
        createdAt: Date.now(),
      });
      try {
        window.location.href = result.checkoutUrl;
      } catch {
        submissionLocked.current = false;
        setFormError(pick("تعذر فتح بوابة الدفع. حاول مرة أخرى.", "Unable to open the payment gateway. Try again."));
      }
    },
    onError: (reason) => {
      submissionLocked.current = false;
      setFormError(renewalErrorMessage(reason, pick));
    },
  });

  const submit = () => {
    if (submissionLocked.current || egyptianRenewal.isPending || gulfRenewal.isPending) return;
    setSelectionTouched(true);
    setFormError("");
    const selectedPackage = activePackages.find((item) => item.id === packageId);
    if (!selectedPackage) {
      setFormError(pick("اختر باقة تجديد متاحة أولًا.", "Select an available renewal package first."));
      return;
    }
    if (!subscription || !eligible || (registrationMode !== "egyptian" && registrationMode !== "gulf")) return;
    if (privateContext && (!privateContext.subscriptionId || !privateContext.subjectId)) {
      setFormError(pick("بيانات الاشتراك الخاص غير مكتملة.", "The private subscription data is incomplete."));
      return;
    }

    const common = {
      packageId: selectedPackage.id,
      ...(privateContext?.subscriptionId ? { subscriptionId: privateContext.subscriptionId } : {}),
      ...(privateContext?.subjectId ? { subjectId: privateContext.subjectId } : {}),
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
    };

    if (registrationMode === "egyptian") {
      submissionLocked.current = true;
      egyptianRenewal.mutate({
        ...common,
        method,
        ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
      });
      return;
    }

    if (!provider) {
      setFormError(pick("اختر طريقة الدفع للمتابعة.", "Select a payment provider to continue."));
      return;
    }
    if (provider === "tamara" && (!city.trim() || !region.trim() || !line1.trim())) {
      setFormError(pick("أكمل بيانات عنوان الدفع المطلوبة لتمارا.", "Complete the required Tamara payment address."));
      return;
    }
    submissionLocked.current = true;
    gulfRenewal.mutate({
      provider,
      body: {
        ...common,
        provider,
        ...(provider === "tamara" ? { paymentAddress: { city: city.trim(), region: region.trim(), line1: line1.trim(), ...(line2.trim() ? { line2: line2.trim() } : {}) } } : {}),
        locale: language === "ar" ? "ar_SA" : "en_US",
        isMobile: false,
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></span>
              <div className="min-w-0"><h1 className="text-2xl font-bold">{pick("تجديد الاشتراك", "Renew subscription")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("اختر باقة التجديد وجهّز بيانات الطلب.", "Choose a renewal package and prepare the request details.")}</p></div>
            </div>
            <Button asChild variant="outline"><Link to="/portal/student/subscriptions"><ArrowRight className="h-4 w-4" />{pick("العودة إلى الاشتراكات", "Back to subscriptions")}</Link></Button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4" aria-label={pick("جاري تحميل بيانات التجديد", "Loading renewal data")}><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
        ) : queryError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل بيانات التجديد", "Unable to load renewal data")}</p><Button variant="outline" onClick={retryBaseData}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
        ) : subscriptions.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا يوجد اشتراك متاح للتجديد", "No subscription is available for renewal")}</CardContent></Card>
        ) : !subscription ? (
          <Card><CardContent className="p-10 text-center"><p className="text-destructive">{pick("لم يتم العثور على الاشتراك المطلوب", "The requested subscription was not found")}</p></CardContent></Card>
        ) : !eligible ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">{subscription.hasPendingRenewal ? pick("يوجد طلب تجديد قيد المراجعة", "A renewal request is under review") : pick("هذا الاشتراك غير متاح للتجديد حاليًا", "This subscription is not currently available for renewal")}</CardContent></Card>
        ) : !curriculum?.id ? (
          <Card><CardContent className="p-10 text-center text-destructive">{pick("بيانات المنهج غير متاحة حاليًا", "Curriculum data is currently unavailable")}</CardContent></Card>
        ) : registrationMode !== "egyptian" && registrationMode !== "gulf" ? (
          <Card><CardContent className="p-10 text-center text-destructive">{pick("تعذر تحديد نظام تسجيل الطالب", "The student's registration mode could not be determined")}</CardContent></Card>
        ) : egyptianResult ? (
          <Card><CardContent className="space-y-5 p-6 text-center sm:p-10">
            {egyptianResult.status === "rejected" ? <XCircle className="mx-auto h-12 w-12 text-destructive" /> : <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />}
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{egyptianResult.status === "completed" ? pick("تم تجديد الاشتراك", "Subscription renewed") : egyptianResult.status === "rejected" ? pick("تم رفض طلب التجديد", "Renewal request rejected") : pick("تم إرسال طلب التجديد، وهو الآن قيد مراجعة الإدارة.", "The renewal request was submitted and is now under admin review.")}</h2>
              <p className="text-sm text-muted-foreground">{egyptianResult.status === "pending" ? pick("قيد مراجعة الإدارة", "Under admin review") : egyptianResult.status === "confirmed" ? (egyptianResult.subscription ? pick("تم تأكيد الدفع وإنشاء بيانات الاشتراك.", "Payment was confirmed and subscription data is available.") : pick("تم تأكيد الدفع، وما زال تفعيل الاشتراك قيد الاستكمال.", "Payment is confirmed; subscription activation is still being completed.")) : egyptianResult.status === "completed" ? pick("أكد النظام اكتمال التجديد.", "The system confirmed the renewal is complete.") : egyptianResult.rejectionReason || pick("لم تتم الموافقة على طلب التجديد.", "The renewal request was not approved.")}</p>
            </div>
            <dl className="grid gap-3 text-start sm:grid-cols-2">
              {typeof egyptianResult.amount === "number" && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("المبلغ", "Amount")}</dt><dd className="mt-1 font-semibold">{egyptianResult.amount} {egyptianResult.currency}</dd></div>}
              {typeof egyptianResult.originalAmount === "number" && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("المبلغ الأصلي", "Original amount")}</dt><dd className="mt-1 font-semibold">{egyptianResult.originalAmount} {egyptianResult.currency}</dd></div>}
              {typeof egyptianResult.discountAmount === "number" && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("قيمة الخصم", "Discount")}</dt><dd className="mt-1 font-semibold">{egyptianResult.discountAmount} {egyptianResult.currency}</dd></div>}
              {egyptianResult.method && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("طريقة الدفع", "Payment method")}</dt><dd className="mt-1 font-semibold">{egyptianResult.method}</dd></div>}
              {egyptianResult.referenceNumber && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("رقم المرجع", "Reference number")}</dt><dd className="mt-1 break-all font-semibold">{egyptianResult.referenceNumber}</dd></div>}
              {egyptianResult.paymentId && <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{pick("رقم عملية الدفع", "Payment ID")}</dt><dd className="mt-1 break-all font-semibold">{egyptianResult.paymentId}</dd></div>}
            </dl>
            {egyptianResult.status !== "completed" && egyptianResult.status !== "rejected" && <Button type="button" variant="outline" onClick={() => { setFormError(""); egyptianStatus.mutate(egyptianResult.paymentId); }} disabled={egyptianStatus.isPending}>{egyptianStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}<RefreshCw className="h-4 w-4" />{pick("تحديث الحالة", "Refresh status")}</Button>}
            {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}
          </CardContent></Card>
        ) : packagesQuery.isLoading ? (
          <div className="space-y-4" aria-label={pick("جاري تحميل باقات التجديد", "Loading renewal packages")}><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
        ) : packagesQuery.isError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل باقات التجديد", "Unable to load renewal packages")}</p><Button variant="outline" onClick={() => void packagesQuery.refetch()} disabled={packagesQuery.isFetching}><RefreshCw className={`h-4 w-4 ${packagesQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
        ) : activePackages.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">{pick("لا توجد باقات تجديد نشطة متاحة حاليًا", "No active renewal packages are currently available")}</CardContent></Card>
        ) : (
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            {privateContext && (
              <Card><CardHeader><CardTitle className="text-lg">{pick("بيانات المادة", "Subject details")}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground">{pick("سيتم تجديد نفس المادة المرتبطة بالاشتراك الأصلي.", "The same subject from the original subscription will be renewed.")}</p>{subscription.subject?.name && <p className="font-medium">{subscription.subject.name}</p>}<input type="hidden" name="subscriptionId" value={privateContext.subscriptionId || ""} /><input type="hidden" name="subjectId" value={privateContext.subjectId || ""} /></CardContent></Card>
            )}

            <Card><CardHeader><CardTitle className="text-lg">{pick("اختر باقة التجديد", "Choose renewal package")}</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">
              {activePackages.map((item) => <Label key={item.id} htmlFor={`renewal-package-${item.id}`} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${packageId === item.id ? "border-primary bg-primary/5" : ""}`}><input id={`renewal-package-${item.id}`} type="radio" name="packageId" value={item.id} checked={packageId === item.id} onChange={() => { setPackageId(item.id); setSelectionTouched(true); }} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span className="min-w-0 flex-1 space-y-2"><span className="flex flex-wrap items-center gap-2"><strong className="break-words">{item.name}</strong>{item.isPopular && <Badge>{pick("الأكثر شيوعًا", "Popular")}</Badge>}</span><span className="block text-sm text-muted-foreground">{packageTypeLabel(item, pick)}{item.accessScope === "single_subject" ? ` • ${pick("مادة واحدة", "Single subject")}` : item.accessScope === "all_subjects" ? ` • ${pick("كل المواد", "All subjects")}` : ""}</span>{typeof item.hours === "number" && <span className="block text-sm">{pick("عدد الساعات", "Hours")}: {item.hours}</span>}{typeof item.months === "number" && <span className="block text-sm">{pick("عدد الأشهر", "Months")}: {item.months}</span>}<span className="block font-semibold">{item.price} {item.currency}</span></span></Label>)}
            </div>{selectionTouched && !packageId && <p role="alert" className="mt-3 text-sm text-destructive">{pick("اختر باقة التجديد للمتابعة", "Select a renewal package to continue")}</p>}</CardContent></Card>

            <Card><CardHeader><CardTitle className="text-lg">{registrationMode === "gulf" ? pick("بيانات الدفع", "Payment details") : pick("بيانات التجديد", "Renewal details")}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="renewal-discount">{pick("كود الخصم (اختياري)", "Discount code (optional)")}</Label><Input id="renewal-discount" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} /></div>{registrationMode === "egyptian" && <><div className="space-y-2"><Label>{pick("طريقة الدفع (اختياري)", "Payment method (optional)")}</Label><Select value={method} onValueChange={(value) => setMethod(value as EgyptianRenewalMethod)}><SelectTrigger aria-label={pick("طريقة الدفع", "Payment method")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">{pick("نقدي", "Cash")}</SelectItem><SelectItem value="bank_transfer">{pick("تحويل بنكي", "Bank transfer")}</SelectItem><SelectItem value="instapay">Instapay</SelectItem><SelectItem value="wallet">{pick("محفظة", "Wallet")}</SelectItem><SelectItem value="other">{pick("أخرى", "Other")}</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="renewal-reference">{pick("رقم المرجع (اختياري)", "Reference number (optional)")}</Label><Input id="renewal-reference" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} /></div></>}
              {registrationMode === "gulf" && <><fieldset className="space-y-3 sm:col-span-2"><legend className="mb-2 text-sm font-medium">{pick("اختر طريقة الدفع", "Choose payment provider")}</legend><div className="grid gap-3 sm:grid-cols-2"><Label htmlFor="renewal-provider-paymob" className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${provider === "paymob" ? "border-primary bg-primary/5" : ""}`}><input id="renewal-provider-paymob" type="radio" name="provider" value="paymob" checked={provider === "paymob"} onChange={() => setProvider("paymob")} className="h-4 w-4 accent-primary" /><CreditCard className="h-5 w-5 text-primary" /><span>{pick("بطاقة بنكية (Paymob)", "Bank card (Paymob)")}</span></Label><Label htmlFor="renewal-provider-tamara" className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${provider === "tamara" ? "border-primary bg-primary/5" : ""}`}><input id="renewal-provider-tamara" type="radio" name="provider" value="tamara" checked={provider === "tamara"} onChange={() => setProvider("tamara")} className="h-4 w-4 accent-primary" /><CreditCard className="h-5 w-5 text-primary" /><span>{pick("تمارا", "Tamara")}</span></Label></div></fieldset>{provider === "tamara" && <fieldset className="grid gap-4 rounded-xl border p-4 sm:col-span-2 sm:grid-cols-2"><legend className="px-2 font-semibold">{pick("عنوان الدفع لتمارا", "Tamara payment address")}</legend><div className="space-y-2"><Label htmlFor="renewal-city">{pick("المدينة *", "City *")}</Label><Input id="renewal-city" value={city} onChange={(event) => setCity(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="renewal-region">{pick("المنطقة *", "Region *")}</Label><Input id="renewal-region" value={region} onChange={(event) => setRegion(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="renewal-line1">{pick("العنوان التفصيلي *", "Address line 1 *")}</Label><Input id="renewal-line1" value={line1} onChange={(event) => setLine1(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="renewal-line2">{pick("تفاصيل إضافية (اختياري)", "Address line 2 (optional)")}</Label><Input id="renewal-line2" value={line2} onChange={(event) => setLine2(event.target.value)} /></div></fieldset>}</>}
              {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">{formError}</p>}
              <div className="sm:col-span-2"><Button type="submit" disabled={egyptianRenewal.isPending || gulfRenewal.isPending}>{(egyptianRenewal.isPending || gulfRenewal.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}{registrationMode === "egyptian" ? (egyptianRenewal.isPending ? pick("جاري إرسال الطلب...", "Submitting request...") : pick("إرسال طلب التجديد", "Submit renewal request")) : (gulfRenewal.isPending ? pick("جاري بدء الدفع...", "Starting payment...") : pick("المتابعة إلى الدفع", "Continue to payment"))}</Button></div>
            </CardContent></Card>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
