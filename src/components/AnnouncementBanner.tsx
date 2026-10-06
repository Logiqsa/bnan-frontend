import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcementsApi";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const pad = (value: number) => String(value).padStart(2, "0");

const getRemainingSeconds = (endsAt?: string | null, now = Date.now()) => {
  if (!endsAt) return null;

  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;

  return Math.max(0, Math.floor((end - now) / 1000));
};

const formatCountdown = (seconds: number, isArabic: boolean) => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = seconds % 60;

  return isArabic
    ? `${days} يوم : ${pad(hours)} ساعة : ${pad(minutes)} دقيقة : ${pad(remainingSeconds)} ثانية`
    : `${days}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(remainingSeconds)}s`;
};

export default function AnnouncementBanner() {
  const { isArabic, pick } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [sequenceCopies, setSequenceCopies] = useState(1);
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const viewportRef = useRef<HTMLDivElement>(null);
  const baseSequenceRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["active-announcement-banner"],
    queryFn: announcementsApi.activeBanner,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    refetchOnMount: "always",
  });
  const announcements = query.data?.data || [];
  const announcementsKey = announcements
    .map(({ id, title, body, type, bannerLink, bannerEndsAt }) => `${id}:${title}:${body}:${type}:${bannerLink || ""}:${bannerEndsAt || ""}`)
    .join("|");
  const hasCountdown = announcements.some(({ bannerEndsAt }) => getRemainingSeconds(bannerEndsAt) !== null);

  useEffect(() => {
    if (!hasCountdown) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasCountdown]);

  const visibleAnnouncements = announcements.filter(
    ({ bannerEndsAt }) => getRemainingSeconds(bannerEndsAt, now) !== 0,
  );

  const contentFor = (announcement: (typeof announcements)[number]) => (
    <span
      dir={isArabic ? "rtl" : "ltr"}
      className="inline-flex items-center gap-3 whitespace-nowrap border-s border-white/20 px-7 py-2.5 text-sm font-medium first:border-s-0"
    >
      <Megaphone className="h-4 w-4 shrink-0 opacity-80" />
      {announcement.type === "important" && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
          {pick("مهم", "Important")}
        </span>
      )}
      <span className="font-semibold">{announcement.title}</span>
      {announcement.body && (
        <span className="font-normal opacity-90">— {announcement.body}</span>
      )}
      {getRemainingSeconds(announcement.bannerEndsAt, now) !== null && (
        <span
          className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums"
          aria-label={pick("الوقت المتبقي لانتهاء العرض", "Time remaining until offer ends")}
        >
          {formatCountdown(getRemainingSeconds(announcement.bannerEndsAt, now) || 0, isArabic)}
        </span>
      )}
    </span>
  );

  const baseSequence = visibleAnnouncements;
  const sequence = Array.from({ length: sequenceCopies }, () => baseSequence).flat();
  const bannerColor = query.data?.bannerColor || "#0f2348";

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const base = baseSequenceRef.current;
    const sequenceElement = sequenceRef.current;
    if (!viewport || !base || !sequenceElement || !visibleAnnouncements.length) return;

    const syncMeasurements = () => {
      const baseWidth = base.getBoundingClientRect().width;
      if (!baseWidth) return;

      // Fill the viewport with complete base sequences. The second visible
      // group is a clone of this calculated sequence, not another restart.
      const nextCopies = Math.max(1, Math.ceil(viewport.clientWidth / baseWidth));
      if (nextCopies !== sequenceCopies) {
        setSequenceCopies(nextCopies);
        setSequenceWidth(0);
        return;
      }

      const measuredSequenceWidth = sequenceElement.getBoundingClientRect().width;
      if (measuredSequenceWidth) setSequenceWidth(measuredSequenceWidth);
    };

    syncMeasurements();
    const observer = new ResizeObserver(syncMeasurements);
    observer.observe(viewport);
    observer.observe(base);
    observer.observe(sequenceElement);
    return () => observer.disconnect();
  }, [announcementsKey, visibleAnnouncements.length, sequenceCopies]);

  if (!visibleAnnouncements.length || dismissed) return null;

  const renderSequence = (
    items: typeof sequence,
    hidden = false,
    ref?: RefObject<HTMLDivElement>,
  ) => (
    <div
      ref={ref}
      aria-hidden={hidden}
      className="announcement-banner-sequence flex min-w-max shrink-0 items-center"
    >
      {items.map((announcement, index) => {
        const content = contentFor(announcement);
        return announcement.bannerLink ? (
          <Link
            key={`${announcement.id}-${index}`}
            to={announcement.bannerLink}
            className="block shrink-0 transition-opacity hover:opacity-80"
            aria-label={pick("فتح العرض", "Open offer")}
          >
            {content}
          </Link>
        ) : (
          <span key={`${announcement.id}-${index}`} className="block shrink-0">
            {content}
          </span>
        );
      })}
    </div>
  );

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      style={{ backgroundColor: bannerColor }}
      className="announcement-banner relative z-40 flex w-full items-center overflow-hidden border-b border-white/20 text-white"
      aria-label={pick("إعلانات العروض", "Offer announcements")}
    >
      <div ref={viewportRef} className="announcement-banner-viewport min-w-0 flex-1 overflow-hidden">
        <div ref={baseSequenceRef} aria-hidden="true" className="announcement-banner-measure">
          {renderSequence(baseSequence, true)}
        </div>
        <div
          className="announcement-banner-marquee flex w-max items-center"
          style={
            {
              animationPlayState: sequenceWidth ? undefined : "paused",
            } as CSSProperties
          }
        >
          {renderSequence(sequence, false, sequenceRef)}
          {renderSequence(sequence, true)}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        className="mx-2 h-7 w-7 shrink-0 rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
        aria-label={pick("إغلاق الإعلان", "Dismiss announcements")}
      >
        <X className="h-4 w-4" />
      </Button>
    </aside>
  );
}
