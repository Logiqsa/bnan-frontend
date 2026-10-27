import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, CalendarDays, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { notificationsApi } from "@/api/notificationsApi";
import type { PortalRole } from "@/api/types";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const backRoutes: Record<PortalRole, string> = {
  admin: "/admin/notifications/history",
  teacher: "/portal/teacher/notifications",
  student: "/portal/student/notifications",
  supervisor: "/portal/supervisor/classrooms",
};

export default function GlobalNotificationDetails({ role }: { role: PortalRole }) {
  const { broadcastId = "" } = useParams();
  const navigate = useNavigate();
  const { isArabic, pick } = useLanguage();
  const query = useQuery({
    queryKey: ["global-notification", broadcastId],
    queryFn: () => notificationsApi.getGlobal(broadcastId),
    enabled: Boolean(broadcastId),
    retry: false,
  });
  const notification = query.data?.data;

  return <DashboardLayout><main className="mx-auto w-full max-w-4xl space-y-5" dir={isArabic ? "rtl" : "ltr"}>
    <Button type="button" variant="ghost" className="gap-2" onClick={() => navigate(backRoutes[role])}>
      <ArrowLeft className="h-4 w-4" />{pick("العودة للإشعارات", "Back to notifications")}
    </Button>
    {query.isLoading ? <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      : query.isError || !notification ? <Card><CardContent className="flex flex-col items-center gap-4 p-12 text-center"><Bell className="h-10 w-10 text-muted-foreground" /><div><h1 className="text-xl font-bold">{pick("تعذر فتح الإشعار", "Unable to open notification")}</h1><p className="mt-2 text-sm text-muted-foreground">{pick("قد يكون الإشعار غير موجود أو غير متاح لهذا الحساب.", "The notification may not exist or may not be available to this account.")}</p></div><Button variant="outline" className="gap-2" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span><div className="min-w-0"><CardTitle dir="auto" className="break-words text-2xl leading-9">{notification.title || pick("إشعار", "Notification")}</CardTitle><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(notification.createdAt))}</p></div></div></CardHeader><CardContent className="space-y-5 p-5 sm:p-7">{notification.image && <img src={notification.image} alt={notification.title || pick("صورة الإشعار", "Notification image")} className="max-h-[32rem] w-full rounded-xl border object-contain" />}{notification.body ? <p dir="auto" className="whitespace-pre-wrap break-words text-base leading-8">{notification.body}</p> : <p className="text-muted-foreground">{pick("لا توجد تفاصيل إضافية.", "No additional details.")}</p>}</CardContent></Card>}
  </main></DashboardLayout>;
}
