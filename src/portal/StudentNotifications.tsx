import { useState } from "react";
import { Bell, CheckCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useNotificationsContext } from "@/contexts/notifications-context";
import { notificationLink } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const StudentNotificationsContent = () => {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { isArabic, pick } = useLanguage();
  const { items, unreadCount, loading, error, reload, markRead, markAllRead, deleteNotification } = useNotificationsContext();
  const run = (operation: Promise<void>) => void operation.catch(() => toast.error(pick("تعذر تحديث الإشعارات.", "Unable to update notifications.")));

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteNotification(deleteTarget);
      setDeleteTarget(null);
      toast.success(pick("تم حذف الإشعار.", "Notification deleted."));
    } catch {
      toast.error(pick("تعذر حذف الإشعار.", "Unable to delete notification."));
    } finally {
      setDeleting(false);
    }
  };

  return <><div className="mx-auto w-full max-w-5xl space-y-5">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span><div className="min-w-0"><h1 className="text-2xl font-bold">{pick("الإشعارات", "Notifications")}</h1><p className="mt-1 text-sm text-muted-foreground">{unreadCount > 0 ? pick(`${unreadCount} إشعار غير مقروء`, `${unreadCount} unread notifications`) : pick("لا توجد إشعارات غير مقروءة", "No unread notifications")}</p></div></div>
      {unreadCount > 0 && <Button variant="outline" onClick={() => run(markAllRead())}><CheckCheck className="h-4 w-4" />{pick("تحديد الكل كمقروء", "Mark all as read")}</Button>}
    </header>

    {loading && items.length === 0 ? <div className="space-y-3" aria-label={pick("جاري تحميل الإشعارات", "Loading notifications")}>{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-2xl" />)}</div>
      : error && items.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="text-destructive">{pick("تعذر تحميل الإشعارات", "Unable to load notifications")}</p><Button variant="outline" onClick={() => void reload()}><RefreshCw className="h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : items.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground"><Bell className="mx-auto mb-3 h-9 w-9 opacity-50" /><p>{pick("لا توجد إشعارات حتى الآن", "No notifications yet")}</p></CardContent></Card>
      : <ul className="space-y-3">{items.map((notification) => {
        const link = notificationLink(notification, "student");
        return <li key={notification.id}><Card className={!notification.isRead ? "border-primary/30 bg-primary/[0.03]" : ""}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5"><button type="button" className={`flex min-w-0 flex-1 items-start gap-3 text-start ${link ? "cursor-pointer" : "cursor-default"}`} onClick={() => { if (!notification.isRead) run(markRead(notification.id)); if (link) navigate(link); }}><div className="flex min-w-0 flex-1 items-start gap-2"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-muted-foreground/30" : "bg-primary"}`} /><div className="min-w-0"><p className="break-words font-semibold">{notification.title || pick("إشعار", "Notification")}</p>{notification.body && <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{notification.body}</p>}<p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: isArabic ? ar : enUS })}</p></div></div>{notification.image && <img src={notification.image} alt="" loading="lazy" className="h-20 w-24 shrink-0 rounded-xl border object-cover sm:h-24 sm:w-32" />}</button><div className="flex items-center gap-1 self-end sm:self-start">{!notification.isRead && <Button size="sm" variant="ghost" onClick={() => run(markRead(notification.id))}>{pick("تحديد كمقروء", "Mark as read")}</Button>}<Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={pick("حذف الإشعار", "Delete notification")} onClick={() => setDeleteTarget(notification.id)}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card></li>;
      })}</ul>}
  </div><AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => { if (!nextOpen && !deleting) setDeleteTarget(null); }}><AlertDialogContent dir={isArabic ? "rtl" : "ltr"}><AlertDialogHeader className={isArabic ? "text-right" : "text-left"}><AlertDialogTitle>{pick("حذف الإشعار", "Delete notification")}</AlertDialogTitle><AlertDialogDescription>{pick("هل تريد حذف هذا الإشعار؟ لن يظهر لك مرة أخرى، ولن يتأثر باقي المستلمين.", "Delete this notification? It will no longer appear for you, and other recipients will not be affected.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>{pick("إلغاء", "Cancel")}</AlertDialogCancel><AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>{deleting && <Loader2 className="h-4 w-4 animate-spin" />}{pick("حذف", "Delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
};

export default function StudentNotifications() {
  return <DashboardLayout><StudentNotificationsContent /></DashboardLayout>;
}
