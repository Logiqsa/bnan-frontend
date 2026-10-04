import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

export default function AnnouncementBanner() {
  const { isArabic, pick } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [copies, setCopies] = useState(1);
  const [cycleWidth, setCycleWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const cycleRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["active-announcement-banner"],
    queryFn: announcementsApi.activeBanner,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    refetchOnMount: "always",
  });
  const announcements = query.data?.data || [];

  const contentFor = (announcement: (typeof announcements)[number]) => <span dir={isArabic ? "rtl" : "ltr"} className="inline-flex items-center gap-3 whitespace-nowrap border-s border-white/20 px-7 py-2.5 text-sm font-medium first:border-s-0"><Megaphone className="h-4 w-4 shrink-0 opacity-80" />{announcement.type === "important" && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{pick("مهم", "Important")}</span>}<span className="font-semibold">{announcement.title}</span>{announcement.body && <span className="font-normal opacity-90">— {announcement.body}</span>}</span>;
  const dismiss = () => setDismissed(true);

  const bannerColor = query.data?.bannerColor || "#0f2348";
  // Build one logical offer sequence first. The number of times that sequence is
  // rendered is calculated from its measured width and the current viewport.
  const tickerAnnouncements = Array.from({ length: copies }, () => announcements).flat();
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const base = baseRef.current;
    const cycle = cycleRef.current;
    if (!viewport || !base || !cycle || !announcements.length) return;

    const syncMeasurements = () => {
      const baseWidth = base.scrollWidth;
      if (!baseWidth) return;

      // The cycle must be wider than the viewport. The extra base sequence is
      // what keeps the second cloned track visible at every animation boundary.
      const nextCopies = Math.max(1, Math.ceil(viewport.clientWidth / baseWidth) + 1);
      if (nextCopies !== copies) setCopies(nextCopies);

      // Wait for the calculated copies to render before publishing the distance
      // used by the CSS animation.
      if (nextCopies === copies) setCycleWidth(cycle.scrollWidth);
    };

    syncMeasurements();
    const observer = new ResizeObserver(syncMeasurements);
    observer.observe(viewport);
    observer.observe(base);
    observer.observe(cycle);
    return () => observer.disconnect();
  }, [announcements.length, copies]);

  if (!announcements.length || dismissed) return null;

  const renderTrack = (items: typeof tickerAnnouncements, hidden = false, cycleRefProp?: RefObject<HTMLDivElement>) => <div ref={cycleRefProp} aria-hidden={hidden} className="announcement-banner-track announcement-banner-cycle flex min-w-max shrink-0 items-center">{items.map((announcement, index) => announcement.bannerLink ? <Link key={`${announcement.id}-${index}`} to={announcement.bannerLink} className="block shrink-0 transition-opacity hover:opacity-80" aria-label={pick("فتح العرض", "Open offer")}>{contentFor(announcement)}</Link> : <span key={`${announcement.id}-${index}`} className="block shrink-0">{contentFor(announcement)}</span>)}</div>;
  return <aside dir={isArabic ? "rtl" : "ltr"} style={{ backgroundColor: bannerColor }} className="announcement-banner relative z-40 flex w-full items-center overflow-hidden border-b border-white/20 text-white" aria-label={pick("إعلانات العروض", "Offer announcements")}>
    <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
      <div ref={baseRef} aria-hidden="true" className="announcement-banner-measure announcement-banner-track flex min-w-max items-center">{renderTrack(announcements, true)}</div>
      <div className="announcement-banner-marquee flex w-max items-center" style={{ "--announcement-cycle-width": `${cycleWidth}px`, animationPlayState: cycleWidth ? undefined : "paused" } as CSSProperties}>{renderTrack(tickerAnnouncements, false, cycleRef)}{renderTrack(tickerAnnouncements, true)}</div>
    </div>
    <Button type="button" variant="ghost" size="icon" onClick={dismiss} className="mx-2 h-7 w-7 shrink-0 rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white" aria-label={pick("إغلاق الإعلان", "Dismiss announcements")}><X className="h-4 w-4" /></Button>
  </aside>;
}
