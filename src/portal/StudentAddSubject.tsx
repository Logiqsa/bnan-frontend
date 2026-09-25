import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookPlus, CheckCircle2, CreditCard, Loader2, RefreshCw, Star } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { catalogApi, type PackageOption } from "@/api/catalogApi";
import {
  studentAvailableSubjectsQueryKey,
  studentSubjectPackagesQueryKey,
  studentSubjectRequestsApi,
  type SubjectRequestCheckoutBody,
  type DirectSubjectRequestBody,
  type DirectSubjectRequestResult,
} from "@/api/studentSubjectRequestsApi";
import type { GulfPaymentProvider } from "@/api/types";
import { ApiError } from "@/api/client";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";
import { studentSubjectsQueryKey } from "@/api/studentSubjectsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const formatPrice = (value: number, currency: string, language: "ar" | "en") => {
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
};

const isValidCheckoutUrl = (value: string) => {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const packageDetail = (item: PackageOption, pick: (ar: string, en: string) => string) => {
  if (item.type === "hours" && typeof item.hours === "number") return `${item.hours} ${pick("ساعة", "hours")}`;
  if (item.type === "monthly" && typeof item.months === "number") return `${item.months} ${pick("شهر", "months")}`;
  if (item.type === "hours") return pick("باقة ساعات", "Hours package");
  if (item.type === "monthly") return pick("باقة شهرية", "Monthly package");
  return "";
};

export default function StudentAddSubject() {
  const { language, pick } = useLanguage();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [provider, setProvider] = useState<GulfPaymentProvider>("paymob");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [formError, setFormError] = useState("");
  const [createdRequest, setCreatedRequest] = useState<DirectSubjectRequestResult | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const checkoutLocked = useRef(false);

  const subjectsQuery = useQuery({
    queryKey: studentAvailableSubjectsQueryKey,
    queryFn: studentSubjectRequestsApi.availableSubjects,
    staleTime: 30_000,
    retry: 1,
  });
  const curriculumId = subjectsQuery.data?.curriculum.id || "";
  const registrationMode = subjectsQuery.data?.curriculum.registrationMode;
  const hasSelectableSubject = Boolean(subjectsQuery.data?.subjects.some((item) => item.isSelectable === true));
  const packagesQuery = useQuery({
    queryKey: studentSubjectPackagesQueryKey(curriculumId),
    queryFn: async () => (await catalogApi.packages(curriculumId)).data,
    enabled: Boolean(curriculumId) && hasSelectableSubject,
    staleTime: 60_000,
    retry: 1,
  });
  const activePackages = useMemo(() => (packagesQuery.data || []).filter((item) => item.isActive === true), [packagesQuery.data]);
  const selectableSubjects = useMemo(() => (subjectsQuery.data?.subjects || []).filter((item) => item.isSelectable === true), [subjectsQuery.data]);

  const checkout = useMutation({
    mutationFn: (body: SubjectRequestCheckoutBody) => studentSubjectRequestsApi.checkout(body, idempotencyKey),
    onSuccess: (result) => {
      if (!result.paymentId?.trim() || !result.checkoutUrl?.trim() || !isValidCheckoutUrl(result.checkoutUrl)) {
        checkoutLocked.current = false;
        setFormError(pick("استجابة الدفع غير مكتملة. لم يتم تحويلك إلى بوابة الدفع.", "The payment response is incomplete. You were not redirected."));
        return;
      }
      gulfPaymentDraftStore.saveSubjectRequest({
        paymentId: result.paymentId,
        provider,
        checkoutUrl: result.checkoutUrl,
        createdAt: Date.now(),
      });
      try {
        window.location.href = result.checkoutUrl;
      } catch {
        checkoutLocked.current = false;
        setFormError(pick("تعذر فتح بوابة الدفع. حاول مرة أخرى.", "Unable to open the payment gateway. Try again."));
      }
    },
    onError: (reason) => {
      checkoutLocked.current = false;
      setFormError((reason as ApiError).message || pick("تعذر بدء عملية الدفع.", "Unable to start payment."));
    },
  });

  const directRequest = useMutation({
    mutationFn: (body: DirectSubjectRequestBody) => studentSubjectRequestsApi.requestAdditional(body),
    onSuccess: (requests) => {
      checkoutLocked.current = false;
      const created = requests[0];
      if (!created?.subjectRequestId || !created.status) {
        setFormError(pick("تم إرسال الطلب لكن استجابة النظام غير مكتملة. حدّث الصفحة لمراجعة حالته.", "The request was submitted, but the server response is incomplete. Refresh to review its status."));
        return;
      }
      setCreatedRequest(created);
      void queryClient.invalidateQueries({ queryKey: studentAvailableSubjectsQueryKey });
      void queryClient.invalidateQueries({ queryKey: studentSubjectsQueryKey });
    },
    onError: (reason) => {
      checkoutLocked.current = false;
      setFormError((reason as ApiError).message || pick("تعذر إرسال طلب المادة.", "Unable to submit the subject request."));
    },
  });

  const submit = () => {
    if (checkoutLocked.current || checkout.isPending || directRequest.isPending) return;
    setFormError("");
    const subject = selectableSubjects.find((item) => item.id === subjectId);
    const selectedPackage = activePackages.find((item) => item.id === packageId);
    if (!subject) { setFormError(pick("اختر مادة متاحة أولًا.", "Select an available subject first.")); return; }
    if (!selectedPackage) { setFormError(pick("اختر باقة متاحة أولًا.", "Select an available package first.")); return; }
    if (notes.length > 2000) { setFormError(pick("يجب ألا تتجاوز الملاحظات 2000 حرف.", "Notes must not exceed 2000 characters.")); return; }
    if (registrationMode !== "egyptian" && registrationMode !== "gulf") {
      setFormError(pick("تعذر تحديد نظام تسجيل الطالب من بيانات المنهج.", "Unable to determine the student's registration mode from curriculum data."));
      return;
    }
    if (registrationMode === "egyptian") {
      checkoutLocked.current = true;
      directRequest.mutate({
        subjectIds: [subject.id],
        packageId: selectedPackage.id,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      return;
    }
    if (provider === "tamara" && (!city.trim() || !region.trim() || !line1.trim())) {
      setFormError(pick("أكمل بيانات عنوان الدفع المطلوبة لتمارا.", "Complete the required Tamara payment address."));
      return;
    }
    const body: SubjectRequestCheckoutBody = {
      subjectId: subject.id,
      packageId: selectedPackage.id,
      provider,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
      ...(provider === "tamara" ? { paymentAddress: { city: city.trim(), region: region.trim(), line1: line1.trim(), ...(line2.trim() ? { line2: line2.trim() } : {}) } } : {}),
      locale: language === "ar" ? "ar_SA" : "en_US",
      isMobile: false,
    };
    checkoutLocked.current = true;
    checkout.mutate(body);
  };

  return <DashboardLayout><div className="mx-auto w-full max-w-5xl space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookPlus className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold">{pick("إضافة مادة", "Add subject")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("اختر مادة واحدة وباقة وطريقة الدفع.", "Choose one subject, package, and payment method.")}</p></div></div><Button asChild variant="outline"><Link to="/portal/student/subjects"><ArrowRight className="h-4 w-4" />{pick("العودة إلى موادي", "Back to subjects")}</Link></Button></div></header>

    {subjectsQuery.isLoading ? <div className="space-y-4" aria-label={pick("جاري تحميل المواد المتاحة", "Loading available subjects")}><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      : subjectsQuery.isError ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل المواد المتاحة", "Unable to load available subjects")}</p><Button variant="outline" onClick={() => void subjectsQuery.refetch()} disabled={subjectsQuery.isFetching}><RefreshCw className={`h-4 w-4 ${subjectsQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : registrationMode !== "egyptian" && registrationMode !== "gulf" ? <Card><CardContent className="p-10 text-center text-destructive">{pick("تعذر تحديد نظام تسجيل الطالب من بيانات المنهج.", "Unable to determine the student's registration mode from curriculum data.")}</CardContent></Card>
      : createdRequest ? <Card><CardContent className="space-y-4 p-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><h2 className="text-xl font-bold">{pick("تم إرسال طلب المادة", "Subject request submitted")}</h2><p className="text-muted-foreground">{createdRequest.status === "awaiting_admin_approval" ? pick("الطلب في انتظار مراجعة الإدارة والموافقة عليه.", "The request is awaiting admin review and approval.") : `${pick("حالة الطلب", "Request status")}: ${createdRequest.status}`}</p><Button asChild><Link to="/portal/student/subjects">{pick("العودة إلى موادي", "Back to subjects")}</Link></Button></CardContent></Card>
      : selectableSubjects.length === 0 ? <Card><CardContent className="p-12 text-center"><BookPlus className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-semibold">{pick("لا توجد مواد متاحة للإضافة حاليًا", "No subjects are currently available to add")}</p><p className="mt-2 text-sm text-muted-foreground">{pick("يمكنك مراجعة حالة طلبات المواد الحالية من القائمة أدناه.", "You can review current subject request statuses below.")}</p>{subjectsQuery.data?.subjects.some((item) => item.requestStatus) && <div className="mt-4 flex flex-wrap justify-center gap-2">{subjectsQuery.data.subjects.filter((item) => item.requestStatus).map((item) => <Badge key={item.id} variant="secondary">{item.name}: {item.requestStatus}</Badge>)}</div>}</CardContent></Card>
      : <div className="space-y-6">
        <Card><CardHeader><CardTitle>{pick("1. اختيار المادة", "1. Select subject")}</CardTitle></CardHeader><CardContent><RadioGroup value={subjectId} onValueChange={setSubjectId} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjectsQuery.data?.subjects.map((subject) => <Label key={subject.id} htmlFor={`subject-${subject.id}`} className={`flex min-w-0 items-center gap-3 rounded-xl border p-4 ${subject.isSelectable ? "cursor-pointer hover:border-primary/50" : "cursor-not-allowed bg-muted/50 text-muted-foreground"}`}><RadioGroupItem id={`subject-${subject.id}`} value={subject.id} disabled={!subject.isSelectable} /><span className="min-w-0 flex-1 break-words">{subject.name}</span>{subject.requestStatus && <Badge variant="secondary" className="shrink-0">{subject.requestStatus}</Badge>}</Label>)}</RadioGroup></CardContent></Card>

        <Card><CardHeader><CardTitle>{pick("2. اختيار الباقة", "2. Select package")}</CardTitle></CardHeader><CardContent>{packagesQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div> : packagesQuery.isError ? <div className="flex flex-col items-center gap-3 py-6 text-center"><p className="text-destructive">{pick("تعذر تحميل الباقات", "Unable to load packages")}</p><Button variant="outline" onClick={() => void packagesQuery.refetch()} disabled={packagesQuery.isFetching}><RefreshCw className={`h-4 w-4 ${packagesQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></div> : activePackages.length === 0 ? <p className="py-8 text-center text-muted-foreground">{pick("لا توجد باقات نشطة متاحة", "No active packages are available")}</p> : <RadioGroup value={packageId} onValueChange={setPackageId} className="grid gap-3 sm:grid-cols-2">{activePackages.map((item) => <Label key={item.id} htmlFor={`package-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 hover:border-primary/50"><RadioGroupItem id={`package-${item.id}`} value={item.id} className="mt-1" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="break-words">{item.name}</strong>{item.isPopular && <Badge><Star className="me-1 h-3 w-3" />{pick("الأكثر اختيارًا", "Popular")}</Badge>}</span>{packageDetail(item, pick) && <span className="mt-2 block text-sm text-muted-foreground">{packageDetail(item, pick)}</span>}<span className="mt-3 block text-lg font-bold">{formatPrice(item.price, item.currency, language)}</span></span></Label>)}</RadioGroup>}</CardContent></Card>

        <Card><CardHeader><CardTitle>{registrationMode === "gulf" ? pick("3. طريقة الدفع والبيانات", "3. Payment method and details") : pick("3. بيانات الطلب", "3. Request details")}</CardTitle></CardHeader><CardContent className="space-y-5">{registrationMode === "gulf" && <><RadioGroup value={provider} onValueChange={(value) => setProvider(value as GulfPaymentProvider)} className="grid gap-3 sm:grid-cols-2"><Label htmlFor="provider-paymob" className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"><RadioGroupItem id="provider-paymob" value="paymob" /><CreditCard className="h-5 w-5 text-primary" /><span>{pick("بطاقة بنكية (Paymob)", "Bank card (Paymob)")}</span></Label><Label htmlFor="provider-tamara" className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"><RadioGroupItem id="provider-tamara" value="tamara" /><CreditCard className="h-5 w-5 text-primary" /><span>{pick("تمارا", "Tamara")}</span></Label></RadioGroup>
          {provider === "tamara" && <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"><legend className="px-2 font-semibold">{pick("عنوان الدفع لتمارا", "Tamara payment address")}</legend><div><Label htmlFor="payment-city">{pick("المدينة *", "City *")}</Label><Input id="payment-city" value={city} onChange={(event) => setCity(event.target.value)} /></div><div><Label htmlFor="payment-region">{pick("المنطقة *", "Region *")}</Label><Input id="payment-region" value={region} onChange={(event) => setRegion(event.target.value)} /></div><div className="sm:col-span-2"><Label htmlFor="payment-line1">{pick("العنوان التفصيلي *", "Address line 1 *")}</Label><Input id="payment-line1" value={line1} onChange={(event) => setLine1(event.target.value)} /></div><div className="sm:col-span-2"><Label htmlFor="payment-line2">{pick("تفاصيل إضافية (اختياري)", "Address line 2 (optional)")}</Label><Input id="payment-line2" value={line2} onChange={(event) => setLine2(event.target.value)} /></div></fieldset>}
          <div><Label htmlFor="discount-code">{pick("كود الخصم (اختياري)", "Discount code (optional)")}</Label><Input id="discount-code" dir="ltr" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} /></div></>}
          <div><div className="mb-1 flex items-center justify-between gap-3"><Label htmlFor="subject-notes">{pick("ملاحظات (اختياري)", "Notes (optional)")}</Label><span className="text-xs text-muted-foreground">{notes.length}/2000</span></div><Textarea id="subject-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}
          <Button className="w-full sm:w-auto" onClick={submit} disabled={checkout.isPending || directRequest.isPending || packagesQuery.isLoading || activePackages.length === 0}>{(checkout.isPending || directRequest.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}{registrationMode === "gulf" ? (checkout.isPending ? pick("جاري بدء الدفع...", "Starting payment...") : pick("المتابعة إلى الدفع", "Continue to payment")) : (directRequest.isPending ? pick("جاري إرسال الطلب...", "Submitting request...") : pick("إرسال طلب المادة", "Submit subject request"))}</Button>
          {registrationMode === "gulf" ? <p className="text-xs text-muted-foreground">{pick("لن يُعتبر الدفع مكتملًا إلا بعد تأكيد الحالة من النظام عند العودة.", "Payment is not considered complete until the server confirms it on return.")}</p> : <p className="text-xs text-muted-foreground">{pick("سيتم إرسال الطلب إلى الإدارة للمراجعة، ولن تصبح المادة نشطة فورًا.", "The request will be sent for admin review and will not become active immediately.")}</p>}
        </CardContent></Card>
      </div>}
  </div></DashboardLayout>;
}
