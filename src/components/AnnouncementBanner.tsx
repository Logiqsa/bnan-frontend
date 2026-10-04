import { useState } from "react";
import { ArrowLeft, Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

export default function AnnouncementBanner() {
  const { isArabic, pick } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const query = useQuery({
    queryKey: ["active-announcement-banner"],
    queryFn: announcementsApi.activeBanner,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    refetchOnMount: "always",
  });
  const announcements = query.data?.data || [];

  if (!announcements.length || dismissed) return null;

  const contentFor = (announcement: (typeof announcements)[number]) => <span className="inline-flex items-center gap-3 whitespace-nowrap border-s border-white/20 px-7 py-2.5 text-sm font-medium first:border-s-0"><Megaphone className="h-4 w-4 shrink-0 opacity-80" />{announcement.type === "important" && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{pick("مهم", "Important")}</span>}<span className="font-semibold">{announcement.title}</span>{announcement.body && <span className="font-normal opacity-90">— {announcement.body}</span>}</span>;
  const dismiss = () => setDismissed(true);

  const renderAnnouncements = (hidden = false) => <div aria-hidden={hidden} className="announcement-banner-track flex min-w-max items-center">{announcements.map((announcement) => announcement.bannerLink ? <Link key={announcement.id} to={announcement.bannerLink} className="block transition-opacity hover:opacity-80" aria-label={pick("فتح العرض", "Open offer")}>{contentFor(announcement)}</Link> : <span key={announcement.id}>{contentFor(announcement)}</span>)}</div>;

  const bannerColor = announcements[0]?.bannerColor || "#0f2348";
  const copies = Math.max(2, Math.ceil(8 / announcements.length));
  const repeatedAnnouncements = Array.from({ length: copies }, (_, index) => <span key={index} className="shrink-0">{renderAnnouncements()}</span>);
  return <aside dir={isArabic ? "rtl" : "ltr"} style={{ backgroundColor: bannerColor }} className="announcement-banner relative z-40 mt-[72px] flex w-full items-center overflow-hidden border-b border-white/20 text-white" aria-label={pick("إعلانات العروض", "Offer announcements")}>
    <div className="min-w-0 flex-1 overflow-hidden"><div className="announcement-banner-marquee flex w-max shrink-0 items-center">{repeatedAnnouncements}{repeatedAnnouncements}</div></div>
    <Button type="button" variant="ghost" size="icon" onClick={dismiss} className="mx-2 h-7 w-7 shrink-0 rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white" aria-label={pick("إغلاق الإعلان", "Dismiss announcements")}><X className="h-4 w-4" /></Button>
  </aside>;
}
