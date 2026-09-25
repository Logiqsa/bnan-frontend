import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Megaphone, RefreshCw, ShieldAlert, Smartphone, Wifi } from "lucide-react";
import { toast } from "sonner";
import {
  type StudentNotificationCategory,
  type StudentNotificationChannel,
  type StudentNotificationPreferences,
  type UpdateStudentNotificationPreferencesPayload,
  studentNotificationPreferencesApi,
} from "@/api/studentNotificationPreferencesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";

const studentNotificationPreferencesQueryKey = [
  "student-notification-preferences",
] as const;

const categories: Array<{
  key: StudentNotificationCategory;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
}> = [
  { key: "announcements", label: "الإعلانات", labelEn: "Announcements", description: "إعلانات المنصة والأخبار العامة.", descriptionEn: "Platform announcements and general updates." },
  { key: "attendance", label: "الحضور والغياب", labelEn: "Attendance", description: "تنبيهات الغياب والتأخير المرتبطة بحصصك.", descriptionEn: "Absence and late-arrival alerts for your sessions." },
  { key: "academic", label: "الإشعارات الأكاديمية", labelEn: "Academic notifications", description: "الحصص والجداول والواجبات والتقييمات والشهادات والأداء وتغيير المعلم.", descriptionEn: "Sessions, schedules, homework, evaluations, certificates, performance, and teacher changes." },
  { key: "finance", label: "المدفوعات والاشتراكات", labelEn: "Payments and subscriptions", description: "التنبيهات المتعلقة بالدفع وحالة الاشتراكات.", descriptionEn: "Payment and subscription status alerts." },
  { key: "admin", label: "الإشعارات الإدارية", labelEn: "Administrative notifications", description: "القرارات والتنبيهات الإدارية المرتبطة بحسابك.", descriptionEn: "Administrative decisions and account-related notices." },
  { key: "supervisor", label: "إشعارات المشرف", labelEn: "Supervisor notifications", description: "التنبيهات المتعلقة بمتابعة المشرف.", descriptionEn: "Alerts related to supervisor follow-up." },
  { key: "chat", label: "المحادثات", labelEn: "Conversations", description: "تنبيهات الرسائل الجديدة غير الإلزامية.", descriptionEn: "Non-mandatory new-message alerts." },
];

const channels: Array<{
  key: StudentNotificationChannel;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  icon: typeof Smartphone;
}> = [
  { key: "push", label: "الإشعارات المنبثقة", labelEn: "Push notifications", description: "التنبيهات التي تصل إلى جهازك عند توفر دعم الإشعارات.", descriptionEn: "Alerts delivered to your device when push is available.", icon: Smartphone },
  { key: "socket", label: "التنبيهات الفورية داخل النظام", labelEn: "In-app realtime alerts", description: "ظهور التنبيهات الجديدة مباشرة أثناء استخدام المنصة.", descriptionEn: "Show new alerts immediately while using the platform.", icon: Wifi },
];

type PreferenceRowProps = {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  name: string;
  onChange: (checked: boolean) => void;
};

const PreferenceRow = ({ checked, description, disabled, label, name, onChange }: PreferenceRowProps) => (
  <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <label htmlFor={name} className="font-semibold">{label}</label>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    <Switch id={name} aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </div>
);

const LoadingState = () => (
  <div aria-label="جاري تحميل إعدادات الإشعارات" className="space-y-5">
    <Skeleton className="h-28 w-full rounded-2xl" />
    <Skeleton className="h-80 w-full rounded-2xl" />
    <Skeleton className="h-44 w-full rounded-2xl" />
  </div>
);

export default function StudentNotificationPreferences() {
  const queryClient = useQueryClient();
  const { pick } = useLanguage();
  const query = useQuery({
    queryKey: studentNotificationPreferencesQueryKey,
    queryFn: studentNotificationPreferencesApi.getPreferences,
    staleTime: 60_000,
  });
  const mutation = useMutation({
    mutationFn: studentNotificationPreferencesApi.updatePreferences,
    onSuccess: (response) => {
      queryClient.setQueryData(studentNotificationPreferencesQueryKey, response);
      toast.success(pick("تم حفظ إعدادات الإشعارات.", "Notification preferences saved."));
    },
    onError: (error: Error) => {
      toast.error(error.message || pick("تعذر حفظ إعدادات الإشعارات.", "Unable to save notification preferences."));
    },
  });

  const preferences: StudentNotificationPreferences | undefined = query.data?.data;
  const update = (payload: UpdateStudentNotificationPreferencesPayload) => {
    if (!mutation.isPending) mutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">{pick("إعدادات الإشعارات", "Notification preferences")}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{pick("تحكمي في أنواع الإشعارات التي يتم إرسالها عبر التنبيهات الفورية والإشعارات المنبثقة.", "Control which notification types are delivered through realtime and push alerts.")}</p>
            </div>
          </div>
        </header>

        {query.isLoading ? <LoadingState /> : query.isError || !preferences ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p role="alert" className="text-destructive">{pick("تعذر تحميل إعدادات الإشعارات.", "Unable to load notification preferences.")}</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />{pick("أنواع الإشعارات", "Notification categories")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {categories.map((item) => <PreferenceRow key={item.key} name={`notification-category-${item.key}`} label={pick(item.label, item.labelEn)} description={pick(item.description, item.descriptionEn)} checked={preferences.categories?.[item.key] ?? true} disabled={mutation.isPending} onChange={(checked) => update({ categories: { [item.key]: checked } })} />)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{pick("قنوات الإشعارات", "Notification channels")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {channels.map((item) => <PreferenceRow key={item.key} name={`notification-channel-${item.key}`} label={pick(item.label, item.labelEn)} description={pick(item.description, item.descriptionEn)} checked={preferences.channels?.[item.key] ?? true} disabled={mutation.isPending} onChange={(checked) => update({ channels: { [item.key]: checked } })} />)}
              </CardContent>
            </Card>

            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{pick("إيقاف أي فئة يمنع تنبيهاتها الفورية والمنبثقة غير الإلزامية، لكنها قد تظل ظاهرة داخل مركز الإشعارات. وقد تُرسل بعض التنبيهات المهمة أو النظامية دائمًا.", "Disabling a category stops its non-mandatory realtime and push alerts, but they may remain visible in the notification center. Some important or system alerts may always be delivered.")}</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
