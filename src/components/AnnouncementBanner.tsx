import { useEffect, useState } from "react";
import { ArrowLeft, Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const dismissedKey = (ids: string[]) => `bnan-dismissed-announcements-${ids.join("-")}`;

export default function AnnouncementBanner() {
  const { isArabic, pick } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const query = useQuery({
    queryKey: ["active-announcement-banner"],
    queryFn: announcementsApi.activeBanner,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const announcements = query.data?.data || [];
  const announcementIds = announcements.map((announcement) => announcement.id);

  useEffect(() => {
    setDismissed(Boolean(announcementIds.length && sessionStorage.getItem(dismissedKey(announcementIds))));
  }, [announcementIds.join("-")]);

  if (!announcements.length || dismissed) return null;

  const contentFor = (announcement: (typeof announcements)[number]) => <span className="inline-flex items-center gap-3 whitespace-nowrap border-s border-white/20 px-7 py-2.5 text-sm font-medium first:border-s-0"><Megaphone className="h-4 w-4 shrink-0 opacity-80" />{announcement.type === "important" && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{pick("مهم", "Important")}</span>}<span className="font-semibold">{announcement.title}</span>{announcement.body && <span className="font-normal opacity-90">— {announcement.body}</span>}</span>;
  const dismiss = () => {
    sessionStorage.setItem(dismissedKey(announcementIds), "1");
    setDismissed(true);
  };

  const renderAnnouncements = (hidden = false) => <div aria-hidden={hidden} className="announcement-banner-track flex min-w-max items-center">{announcements.map((announcement) => announcement.bannerLink ? <Link key={announcement.id} to={announcement.bannerLink} className="block transition-opacity hover:opacity-80" aria-label={pick("فتح العرض", "Open offer")}>{contentFor(announcement)}</Link> : <span key={announcement.id}>{contentFor(announcement)}</span>)}</div>;

  return <aside dir={isArabic ? "rtl" : "ltr"} className="relative z-50 flex items-center overflow-hidden border-b border-primary/30 bg-primary text-primary-foreground" aria-label={pick("إعلانات العروض", "Offer announcements")}>
    <div className="min-w-0 flex-1 overflow-hidden"><div className="announcement-banner-marquee flex w-max items-center">{renderAnnouncements()} {renderAnnouncements(true)}</div></div>
    {announcements.some((announcement) => announcement.bannerDismissible !== false) && <Button type="button" variant="ghost" size="icon" onClick={dismiss} className="mx-2 h-7 w-7 shrink-0 text-red-200 hover:bg-red-500/30 hover:text-red-50" aria-label={pick("إغلاق الإعلان", "Dismiss announcements")}><X className="h-4 w-4" /></Button>}
  </aside>;
}
