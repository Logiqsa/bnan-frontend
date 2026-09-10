import { Bell, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adminNotificationLink, useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const NotificationsBell = () => {
  const navigate = useNavigate();
  const { isArabic, language, pick } = useLanguage();
  const { items, unreadCount, loading, error, reload, markRead, markAllRead } = useNotifications(language);
  const run = (operation: Promise<void>) => {
    void operation.catch(() => toast.error(pick("تعذر تحديث الإشعارات.", "Unable to update notifications.")));
  };

  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="icon" className="relative bg-background shadow-sm" aria-label={pick("فتح الإشعارات", "Open notifications")}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px]">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-0" align="end" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between border-b p-3">
        <h4 className="font-cairo font-semibold">{pick("الإشعارات", "Notifications")}</h4>
        {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => run(markAllRead())} className="gap-1 text-xs"><Check className="h-3 w-3" />{pick("قراءة الكل", "Mark all read")}</Button>}
      </div>
      <ScrollArea className="h-80">
        {loading && items.length === 0 ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : error && items.length === 0 ? <div className="space-y-3 p-6 text-center text-sm text-muted-foreground"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void reload()} className="gap-1"><RefreshCw className="h-3 w-3" />{pick("إعادة المحاولة", "Retry")}</Button></div>
          : items.length === 0 ? <div className="p-6 text-center font-cairo text-sm text-muted-foreground">{pick("لا توجد إشعارات", "No notifications")}</div>
          : <ul className="divide-y">{items.map((notification) => <li key={notification.id} onClick={() => {
            if (!notification.isRead) run(markRead(notification.id));
            const link = adminNotificationLink(notification);
            if (link) navigate(link);
          }} className={`cursor-pointer p-3 transition hover:bg-muted/50 ${!notification.isRead ? "bg-primary/5" : ""}`}>
            <div className="flex items-start justify-between gap-2"><p className="font-cairo text-sm font-medium">{notification.title}</p>{!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}</div>
            {notification.body && <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>}
            <p className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: isArabic ? ar : enUS })}</p>
          </li>)}</ul>}
      </ScrollArea>
    </PopoverContent>
  </Popover>;
};

export default NotificationsBell;
