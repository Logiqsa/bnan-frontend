import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Loader2, RefreshCw, Send, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  globalNotificationsApi,
  type GlobalNotificationAudience,
  type GlobalNotificationResult,
  type SendGlobalNotificationPayload,
} from "@/api/globalNotificationsApi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Exported for the audience-contract test kept alongside this screen.
// eslint-disable-next-line react-refresh/only-export-components
export const audienceDetails: Record<GlobalNotificationAudience, { ar: string; en: string; hintAr: string; hintEn: string }> = {
  all: { ar: "الجميع", en: "Everyone", hintAr: "سيتم إرسال الإشعار إلى الطلاب والمعلمين وأولياء الأمور.", hintEn: "The notification will be sent to students, teachers, and parents." },
  student: { ar: "الطلاب", en: "Students", hintAr: "سيتم إرسال الإشعار إلى الطلاب فقط.", hintEn: "The notification will be sent to students only." },
  teacher: { ar: "المعلمين", en: "Teachers", hintAr: "سيتم إرسال الإشعار إلى المعلمين فقط.", hintEn: "The notification will be sent to teachers only." },
  parent: { ar: "أولياء الأمور", en: "Parents", hintAr: "سيتم إرسال الإشعار إلى أولياء الأمور فقط.", hintEn: "The notification will be sent to parents only." },
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

const formatFileSize = (bytes: number, locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + " MB";

export default function GlobalNotificationAdmin() {
  const { isArabic, pick } = useLanguage();
  const [audience, setAudience] = useState<GlobalNotificationAudience>("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GlobalNotificationResult | null>(null);
  const submittingRef = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const trimmedTitle = title.trim();
  const titleValid = trimmedTitle.length > 0 && trimmedTitle.length <= 200;
  const formValid = titleValid && content.length <= 5000 && !imageError;
  const audienceInfo = audienceDetails[audience];

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const clearForm = () => {
    setAudience("all"); setTitle(""); setContent(""); setImage(null); setImageError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setImageError(pick("صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP.", "Unsupported image format. Use PNG, JPG, or WEBP."));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(pick("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.", "The image must not exceed 5 MB."));
      event.target.value = "";
      return;
    }
    setImage(file);
    setImageError("");
  };

  const removeImage = () => {
    setImage(null); setImageError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const requestConfirmation = (event: FormEvent) => {
    event.preventDefault();
    if (!formValid || submittingRef.current) return;
    setConfirming(true);
  };

  const sendNotification = async () => {
    if (!formValid || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const payload: SendGlobalNotificationPayload = {
      title: trimmedTitle,
      audience,
      ...(content.trim() ? { content: content.trim() } : {}),
    };
    try {
      const response = await globalNotificationsApi.sendGlobalNotification(payload, image || undefined);
      setResult(response.data);
      setConfirming(false);
      clearForm();
    } catch (error) {
      const apiError = error as ApiError;
      const message = apiError.status === 413 || apiError.code === "GLOBAL_NOTIFICATION_IMAGE_TOO_LARGE"
        ? pick("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.", "The image must not exceed 5 MB.")
        : apiError.code === "INVALID_UPLOAD_FILE_TYPE"
          ? pick("صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP.", "Unsupported image format. Use PNG, JPG, or WEBP.")
        : apiError.status === 403
        ? pick("ليس لديك صلاحية لإرسال الإشعارات.", "You do not have permission to send notifications.")
        : apiError.status === 401
          ? pick("انتهت الجلسة. سجل الدخول مرة أخرى.", "Your session has expired. Please sign in again.")
          : apiError.status === 400
            ? apiError.message || pick("تحقق من بيانات الإشعار.", "Check the notification details.")
            : pick("تعذر إرسال الإشعار. حاول مرة أخرى.", "Unable to send the notification. Try again.");
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-6xl space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Bell className="h-7 w-7 text-primary" />{pick("إرسال إشعار جديد", "Send a new notification")}</h1>
        <p className="mt-1 text-muted-foreground">{pick("أرسل إشعارًا لمستخدمي منصة بنان.", "Send a notification to Bnan platform users.")}</p>
      </div>

      {result && <Alert className="relative border-emerald-300 bg-emerald-50/80 pe-12 text-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
        <AlertTitle>{pick("تم إرسال الإشعار بنجاح", "Notification sent successfully")}</AlertTitle>
        <Button type="button" variant="ghost" size="icon" className="absolute end-2 top-2 h-8 w-8 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900" onClick={() => setResult(null)} aria-label={pick("إخفاء الرسالة", "Dismiss message")}>
          <X className="h-4 w-4" />
        </Button>
      </Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <Card>
          <CardHeader><CardTitle>{pick("بيانات الإشعار", "Notification details")}</CardTitle><CardDescription>{pick("راجع البيانات بعناية قبل الإرسال؛ سيطلب منك تأكيد العملية.", "Review the details before sending; you will be asked to confirm.")}</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={requestConfirmation} className="space-y-5" noValidate>
              <fieldset disabled={submitting} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="notification-audience">{pick("الجمهور", "Audience")}</Label>
                  <Select value={audience} onValueChange={(value) => setAudience(value as GlobalNotificationAudience)}>
                    <SelectTrigger id="notification-audience"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(audienceDetails) as GlobalNotificationAudience[]).map((value) => <SelectItem key={value} value={value}>{pick(audienceDetails[value].ar, audienceDetails[value].en)}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{pick(audienceInfo.hintAr, audienceInfo.hintEn)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2"><Label htmlFor="notification-title">{pick("عنوان الإشعار", "Notification title")} <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground" dir="ltr">{title.length} / 200</span></div>
                  <Input id="notification-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} aria-invalid={title.length > 0 && !trimmedTitle} />
                  {title.length > 0 && !trimmedTitle && <p className="text-xs text-destructive">{pick("لا يمكن أن يتكون العنوان من مسافات فقط.", "The title cannot contain only spaces.")}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2"><Label htmlFor="notification-content">{pick("محتوى الإشعار", "Notification content")} <span className="font-normal text-muted-foreground">({pick("اختياري", "optional")})</span></Label><span className="text-xs text-muted-foreground" dir="ltr">{content.length} / 5000</span></div>
                  <Textarea id="notification-content" value={content} maxLength={5000} rows={6} onChange={(event) => setContent(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-image">{pick("صورة الإشعار", "Notification image")} <span className="font-normal text-muted-foreground">({pick("اختياري", "optional")})</span></Label>
                  <Input ref={fileInput} id="notification-image" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp" className="hidden" onChange={selectImage} />
                  {!image ? <Button type="button" variant="outline" className="w-full gap-2 border-dashed py-7" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" />{pick("اختر صورة", "Choose image")}</Button> : <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><img src={imagePreview} alt={pick("معاينة الصورة المختارة", "Selected image preview")} className="h-16 w-20 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" dir="ltr">{image.name}</p><p className="text-xs text-muted-foreground" dir="ltr">{formatFileSize(image.size, isArabic ? "ar-SA" : "en-US")}</p></div><Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInput.current?.click()}><RefreshCw className="h-3.5 w-3.5" />{pick("تغيير", "Change")}</Button><Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={removeImage}><Trash2 className="h-3.5 w-3.5" />{pick("حذف", "Remove")}</Button></div>}
                  <p className="text-xs text-muted-foreground">{pick("PNG أو JPG أو WEBP — بحد أقصى 5 MB", "PNG, JPG, or WEBP — maximum 5 MB")}</p>
                  {imageError && <p role="alert" className="text-xs text-destructive">{imageError}</p>}
                </div>
              </fieldset>
              <Button type="submit" className="w-full gap-2" disabled={!formValid || submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? pick("جاري الإرسال...", "Sending...") : pick("إرسال الإشعار", "Send notification")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader><CardTitle className="text-lg">{pick("معاينة الإشعار", "Notification preview")}</CardTitle><CardDescription>{pick("معاينة تقريبية لما سيظهر للمستخدم.", "An approximate preview of what users will see.")}</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
              <div className="space-y-2 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10"><Bell className="h-5 w-5 text-primary" /></span><div className="min-w-0"><p className={trimmedTitle ? "font-bold" : "font-medium text-muted-foreground"}>{trimmedTitle || pick("عنوان الإشعار سيظهر هنا", "The notification title will appear here")}</p>{content.trim() && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{content.trim()}</p>}</div></div></div>
              {imagePreview ? <img src={imagePreview} alt={pick("معاينة صورة الإشعار", "Notification image preview")} className="max-h-64 w-full object-cover" /> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <AlertDialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
      <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
        <AlertDialogHeader><AlertDialogTitle>{pick("إرسال الإشعار؟", "Send notification?")}</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-3">{imagePreview && <img src={imagePreview} alt={pick("صورة الإشعار", "Notification image")} className="max-h-40 w-full rounded-lg object-cover" />}<p>{pick("سيتم إرسال هذا الإشعار إلى:", "This notification will be sent to:")} <strong className="text-foreground">{pick(audienceInfo.ar, audienceInfo.en)}</strong></p><p>{pick("العنوان:", "Title:")} <strong className="text-foreground">“{trimmedTitle}”</strong></p>{content.trim() && <p className="whitespace-pre-wrap text-foreground">{content.trim()}</p>}<p>{pick(audienceInfo.hintAr, audienceInfo.hintEn)}</p><p>{pick("هل تريد المتابعة؟", "Do you want to continue?")}</p></div></AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={submitting}>{pick("إلغاء", "Cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void sendNotification(); }} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? pick("جاري الإرسال...", "Sending...") : pick("إرسال", "Send")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DashboardLayout>;
}
