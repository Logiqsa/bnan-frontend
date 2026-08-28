import { Apple, Download } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.bnanacademy.app&pcampaignid=web_share";

const GooglePlayMark = ({ small = false }: { small?: boolean }) => (
  <svg viewBox="0 0 48 52" aria-hidden="true" className={`${small ? "h-7 w-6" : "h-9 w-8"} shrink-0`}>
    <path fill="#00d6ff" d="M3.8 2.6 28 26 3.9 49.5A6.4 6.4 0 0 1 2 44.8V7.2c0-1.8.6-3.4 1.8-4.6Z" />
    <path fill="#ffcf3c" d="m28 26 7.7-7.5 9.1 5.1c2.7 1.5 2.7 3.9.1 5.4l-9.2 5.1L28 26Z" />
    <path fill="#ff4b55" d="M3.8 2.6A6 6 0 0 1 10.7 2l25 14.1-7.7 7.5L3.8 2.6Z" />
    <path fill="#00e676" d="m28 28.4 7.7 7.5-25 14.1a6 6 0 0 1-6.8-.5L28 28.4Z" />
  </svg>
);

type Props = { onDark?: boolean; compact?: boolean; footerStyle?: boolean; className?: string };

const AppStoreButtons = ({ onDark = false, compact = false, footerStyle = false, className = "" }: Props) => {
  const { pick } = useLanguage();
  const surface = footerStyle
    ? "border-primary-foreground/25 bg-transparent text-primary-foreground hover:border-secondary/60 hover:bg-primary-foreground/5"
    : onDark
    ? "border-white/25 bg-transparent text-white hover:border-white/45 hover:bg-white/5"
    : "border-border bg-card text-foreground hover:border-primary/30";
  const iosSurface = footerStyle
    ? "border-primary-foreground/25 bg-transparent text-primary-foreground"
    : onDark
    ? "border-white/20 bg-white/10 text-white"
    : "border-border bg-muted/50 text-foreground";

  return (
    <div className={`grid w-full grid-cols-1 gap-3 ${compact ? "max-w-sm" : "max-w-md md:grid-cols-2"} ${className}`}>
      <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer"
        aria-label={pick("تحميل التطبيق من Google Play", "Download from Google Play")}
        className={`group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-2xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${footerStyle ? "min-h-[58px] gap-2.5 px-3.5 py-2" : "min-h-[76px] gap-3 px-5 py-3"} ${surface}`}>
        <GooglePlayMark small={footerStyle} />
        <span className="min-w-0 text-start" dir="ltr"><span className={`block whitespace-nowrap opacity-55 ${footerStyle ? "text-[9px]" : "text-[10px]"}`}>GET IT ON</span><span className={`block whitespace-nowrap font-semibold ${footerStyle ? "text-base" : "text-lg"}`}>Google Play</span></span>
        <Download className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-50" />
      </a>
      <div aria-label={pick("تطبيق iOS قريبًا", "iOS app coming soon")}
        className={`grid min-w-0 cursor-not-allowed grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-2xl border ${footerStyle ? "min-h-[58px] gap-2 px-3 py-2" : "min-h-[76px] gap-3 px-4 py-3"} ${iosSurface}`}>
        <Apple
          className={`${footerStyle ? "h-7 w-7" : "h-9 w-9"} shrink-0`}
          fill="currentColor"
          strokeWidth={1.4}
        />
        <span className="min-w-0 text-start" dir="ltr"><span className={`block whitespace-nowrap opacity-50 ${footerStyle ? "text-[8px]" : "text-[10px]"}`}>COMING SOON ON</span><span className={`block whitespace-nowrap font-semibold ${footerStyle ? "text-base" : "text-lg"}`}>App Store</span></span>
        <span className={`shrink-0 whitespace-nowrap rounded-full bg-secondary font-bold text-secondary-foreground ${footerStyle ? "px-1.5 py-px text-[7px]" : "px-2 py-0.5 text-[9px]"}`}>{pick("قريبًا", "Soon")}</span>
      </div>
    </div>
  );
};

export default AppStoreButtons;
