import { useEffect, useState } from "react";
import { ArrowLeft, Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const dismissedKey = (id: string) => `bnan-dismissed-announcement-${id}`;

export default function AnnouncementBanner() {
  const { isArabic, pick } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const query = useQuery({
    queryKey: ["active-announcement-banner"],
    queryFn: announcementsApi.activeBanner,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const announcement = query.data?.data;

  useEffect(() => {
    setDismissed(Boolean(announcement?.id && sessionStorage.getItem(dismissedKey(announcement.id))));
  }, [announcement?.id]);

  if (!announcement || dismissed) return null;

  const content = <div className="announcement-banner-track flex min-w-max items-center gap-3 px-6 py-2.5 text-sm font-medium"><Megaphone className="h-4 w-4 shrink-0" /><span>{announcement.title}</span>{announcement.body && <span className="font-normal opacity-90">— {announcement.body}</span>}</div>;
  const dismiss = () => {
    sessionStorage.setItem(dismissedKey(announcement.id), "1");
    setDismissed(true);
  };

  return <aside dir={isArabic ? "rtl" : "ltr"} className={`relative z-50 flex items-center overflow-hidden border-b ${announcement.type === "important" ? "border-amber-300 bg-amber-500 text-amber-950" : "border-primary/30 bg-primary text-primary-foreground"}`} aria-label={pick("إعلان العرض", "Offer announcement")}>
    <div className="min-w-0 flex-1 overflow-hidden"><div className="announcement-banner-marquee flex w-max items-center">{announcement.bannerLink ? <Link to={announcement.bannerLink} className="block transition-opacity hover:opacity-80" aria-label={pick("فتح العرض", "Open offer")}>{content}</Link> : content}<div aria-hidden="true">{content}</div></div></div>
    {announcement.bannerLink && <Link to={announcement.bannerLink} className="hidden shrink-0 items-center gap-1 px-3 text-xs font-semibold sm:flex">{pick("التفاصيل", "Details")}<ArrowLeft className="h-3.5 w-3.5" /></Link>}
    {announcement.bannerDismissible !== false && <Button type="button" variant="ghost" size="icon" onClick={dismiss} className="mx-2 h-7 w-7 shrink-0 hover:bg-black/10" aria-label={pick("إغلاق الإعلان", "Dismiss announcement")}><X className="h-4 w-4" /></Button>}
  </aside>;
}
