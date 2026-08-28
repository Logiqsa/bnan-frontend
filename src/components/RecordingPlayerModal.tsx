import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
    className="fixed inset-0 z-[9999] grid place-items-center bg-black/90 p-0 backdrop-blur-md sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label={`${pick("تشغيل", "Play")} ${recording.sessionName}`}
    onMouseDown={onClose}
  >
    <div dir={isArabic ? "rtl" : "ltr"} className="w-full max-w-6xl overflow-hidden border-white/10 bg-[#090909] shadow-2xl sm:rounded-2xl sm:border" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-5">
        <h2 className="truncate text-base font-semibold">{recording.sessionName}</h2>
        <button type="button" onClick={onClose} aria-label={pick("إغلاق المشغل", "Close player")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="aspect-video w-full bg-black">
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
