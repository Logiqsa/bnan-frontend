import { useEffect, useRef } from "react";
import { PlayCircle, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export interface PlayerRecording {
  sessionName: string;
  recordingLink: string;
}

export default function RecordingPlayerModal({
  recording,
  onClose,
}: {
  recording: PlayerRecording | null;
  onClose: () => void;
}) {
  const { isArabic, pick } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!recording) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    const video = videoRef.current;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [recording, onClose]);

  if (!recording) return null;

  return <div
    className="fixed inset-0 z-[9999] grid place-items-center bg-primary/90 p-3 backdrop-blur-sm sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label={`${pick("تشغيل", "Play")} ${recording.sessionName}`}
    onMouseDown={onClose}
  >
    <div dir={isArabic ? "rtl" : "ltr"} className="w-full max-w-5xl overflow-hidden rounded-2xl border border-secondary/25 bg-primary shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between gap-4 border-b border-secondary/10 px-4 py-3.5 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary"><PlayCircle className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs text-secondary/70">{pick("مشاهدة التسجيل", "Now playing")}</p><h2 className="truncate text-sm font-semibold sm:text-base">{recording.sessionName}</h2></div></div>
        <button type="button" onClick={onClose} aria-label={pick("إغلاق المشغل", "Close player")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary/10 transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="aspect-video max-h-[calc(100vh-8rem)] w-full bg-black">
        <video
          ref={videoRef}
          src={recording.recordingLink}
          className="h-full w-full bg-black object-contain"
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
        >
          {pick("المتصفح لا يدعم تشغيل الفيديو.", "Your browser does not support video playback.")}
        </video>
      </div>
    </div>
  </div>;
}
