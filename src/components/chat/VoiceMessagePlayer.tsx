import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface VoiceMessagePlayerProps {
  src: string;
  label?: string;
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export default function VoiceMessagePlayer({ src, label }: VoiceMessagePlayerProps) {
  const { pick } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = useMemo(
    () => Array.from({ length: 42 }, (_, index) => 7 + ((index * 17 + 11) % 19)),
    [],
  );
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current;
    if (audio) audio.load();
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (clientX: number) => {
    const audio = audioRef.current;
    const waveform = waveformRef.current;
    if (!audio || !waveform || !duration) return;
    const bounds = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-950 px-2 py-1.5 text-white shadow-md"
      dir="ltr"
      aria-label={label || pick("رسالة صوتية", "Voice message")}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-slate-950 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        onClick={() => void toggle()}
        aria-label={playing ? pick("إيقاف الصوت", "Pause voice message") : pick("تشغيل الصوت", "Play voice message")}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ms-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <button
          ref={waveformRef}
          type="button"
          className="flex h-7 w-full items-center gap-[2px] overflow-hidden rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          onClick={(event) => seek(event.clientX)}
          aria-label={pick("تقدم الرسالة الصوتية", "Voice message progress")}
        >
          {bars.map((height, index) => (
            <span
              key={index}
              className={`min-w-[2px] flex-1 rounded-full transition-colors ${index / bars.length <= progress ? "bg-sky-300" : "bg-slate-600"}`}
              style={{ height: `${Math.max(4, Math.round(height * 0.68))}px` }}
            />
          ))}
        </button>
        <div className="flex items-center justify-between px-1 text-[9px] text-slate-300">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
