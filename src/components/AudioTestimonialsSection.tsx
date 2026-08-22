import { motion } from "framer-motion";
import { Play, Pause, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { contentApi, DEFAULT_LEGACY_VISIBILITY } from "@/api/contentApi";

// المحتوى القديم يظل ظاهرًا دائمًا، وتُضاف إليه العناصر القادمة من لوحة الإدارة.
const fallbackStories = [
  { name: "أم عبدالعزيز", audioSrc: "/audio/testimonial-1.mp3" },
  { name: "أم كنان", audioSrc: "/audio/testimonial-2.mp3" },
  { name: "أم عبدالله", audioSrc: "/audio/testimonial-3.mp3" },
];

const useSuccessStories = () => {
  const [stories, setStories] = useState(fallbackStories);

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, visibilityResult] = await Promise.all([
          contentApi.getSuccessStories().catch(() => ({ data: [] })),
          contentApi.getLegacyVisibility().catch(() => ({ data: DEFAULT_LEGACY_VISIBILITY })),
        ]);
        const legacy = visibilityResult.data.successStories ? fallbackStories : [];
        const existingSources = new Set(fallbackStories.map((story) => story.audioSrc));
        const added = [...data]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({ name: s.name, audioSrc: s.audioUrl }))
          .filter((story) => !existingSources.has(story.audioSrc));
        setStories([...legacy, ...added]);
      } catch {
        // Keep the static fallback stories.
      }
    })();
  }, []);

  return stories;
};

const WaveformBars = ({ isPlaying, progress }: { isPlaying: boolean; progress: number }) => {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const heights = [40, 65, 30, 80, 50, 90, 35, 70, 55, 85, 45, 75, 60, 95, 40, 70, 50, 80, 35, 65, 55, 90, 45, 75, 60, 85, 40, 70];
    return heights[i % heights.length];
  });

  const playedBars = Math.floor(progress * bars.length);

  return (
    <div className="flex items-center gap-[2px] h-8 flex-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[2.5px] rounded-full transition-colors duration-150 ${
            i < playedBars ? "bg-primary" : "bg-primary/30"
          }`}
          style={{
            height: `${h}%`,
            animation: isPlaying && i >= playedBars - 2 && i <= playedBars + 2
              ? "pulse 0.5s ease-in-out infinite alternate"
              : "none",
          }}
        />
      ))}
    </div>
  );
};

const AudioCard = ({ item, index, currentPlaying, setCurrentPlaying }: {
  item: { name: string; audioSrc: string };
  index: number;
  currentPlaying: number | null;
  setCurrentPlaying: (i: number | null) => void;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const isPlaying = currentPlaying === index;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setCurrentPlaying(null);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [index, setCurrentPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      setCurrentPlaying(null);
    } else {
      setCurrentPlaying(index);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12 }}
      className="flex flex-col items-center"
    >
      <div
        onClick={togglePlay}
        className="block w-full rounded-2xl border border-border/50 bg-card p-5 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group shadow-sm"
      >
        <audio ref={audioRef} src={item.audioSrc} preload="metadata" />

        {/* Waveform + Play button */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            isPlaying ? "bg-primary text-primary-foreground" : "bg-primary/15 group-hover:bg-primary/25"
          }`}>
            {isPlaying ? (
              <Pause size={20} className={isPlaying ? "fill-primary-foreground text-primary-foreground" : ""} />
            ) : (
              <Play size={20} className="text-primary fill-primary mr-[-2px]" />
            )}
          </div>
          <WaveformBars isPlaying={isPlaying} progress={progress} />
        </div>
      </div>
      <p className="text-center mt-2 font-cairo font-semibold text-sm text-foreground">{item.name}</p>
    </motion.div>
  );
};

const AudioTestimonialsSection = () => {
  const [currentPlaying, setCurrentPlaying] = useState<number | null>(null);
  const audioTestimonials = useSuccessStories();

  return (
    <section className="py-16 md:py-24 bg-background" dir="rtl">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-cairo font-bold text-foreground mb-3">
            قصص نجاح بدأت مع بنان خطوة بخطوة
          </h2>
          <p className="text-lg font-tajawal text-muted-foreground mb-4">
            نسبة نجاح تصل إلى 98٪!
          </p>
          <a
            href="https://www.instagram.com/bnanacademy_sa/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-tajawal"
          >
            <ExternalLink size={18} />
            شوف أكثر على إنستقرام!
          </a>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {audioTestimonials.map((item, index) => (
            <AudioCard
              key={index}
              item={item}
              index={index}
              currentPlaying={currentPlaying}
              setCurrentPlaying={setCurrentPlaying}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-xl font-cairo font-bold text-foreground"
        >
          كلماتهم هي أكبر شهادة نجاح لنا <span className="text-primary">♥</span>
        </motion.p>
      </div>
    </section>
  );
};

export default AudioTestimonialsSection;
