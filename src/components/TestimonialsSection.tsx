import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { contentApi } from "@/api/contentApi";

import t2 from "@/assets/testimonials/testimonial-2.png";
import t3 from "@/assets/testimonials/testimonial-3.png";
import t4 from "@/assets/testimonials/testimonial-4.png";
import t5 from "@/assets/testimonials/testimonial-5.png";
import t6 from "@/assets/testimonials/testimonial-6.png";
import t7 from "@/assets/testimonials/testimonial-7.png";
import t8 from "@/assets/testimonials/testimonial-8.png";
import w1 from "@/assets/testimonials/whatsapp/wa-1.jpeg";
import w2 from "@/assets/testimonials/whatsapp/wa-2.jpeg";
import w3 from "@/assets/testimonials/whatsapp/wa-3.jpeg";
import w4 from "@/assets/testimonials/whatsapp/wa-4.jpeg";
import w5 from "@/assets/testimonials/whatsapp/wa-5.jpeg";
import w6 from "@/assets/testimonials/whatsapp/wa-6.jpeg";
import w7 from "@/assets/testimonials/whatsapp/wa-7.jpeg";
import w8 from "@/assets/testimonials/whatsapp/wa-8.jpeg";

// Used until the admin-managed endpoint has real data (or if it's unreachable).
const fallbackRowOne = [t2, t3, t4, w1, w2, w3, w4];
const fallbackRowTwo = [t5, t6, t7, t8, w5, w6, w7, w8];

const EMOJIS = ["🚀", "⭐", "🏆", "🥇", "🎉", "💫", "✨", "🎯", "📚", "🌟", "🎊", "💎"];

type Bubble = {
  id: number;
  emoji: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
};

const generateBubbles = (count: number): Bubble[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: Math.random() * 100,
    size: 20 + Math.random() * 28,
    duration: 12 + Math.random() * 14,
    delay: Math.random() * 10,
  }));

const Marquee = ({
  images,
  reverse = false,
  duration = 60,
  groupKey,
}: {
  images: string[];
  reverse?: boolean;
  duration?: number;
  groupKey: string;
}) => {
  const render = (k: string) =>
    images.map((src, i) => (
      <div
        key={`${k}-${i}`}
        className="shrink-0 rounded-2xl overflow-hidden shadow-md border border-primary/10 bg-card"
      >
        <img
          src={src}
          alt={`رأي عميل ${i + 1}`}
          loading="eager"
          decoding="async"
          className="block h-[160px] md:h-[200px] w-auto"
        />
      </div>
    ));

  return (
    <div dir="ltr" className="relative w-full overflow-hidden min-h-[170px] md:min-h-[210px]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div
        className="flex w-max gap-4 md:gap-6"
        style={{
          animation: `${reverse ? "marquee-reverse" : "marquee"} ${duration}s linear infinite`,
          willChange: "transform",
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
        }}
      >
        <div className="flex shrink-0 gap-4 md:gap-6">{render(`${groupKey}-a`)}</div>
        <div className="flex shrink-0 gap-4 md:gap-6" aria-hidden="true">
          {render(`${groupKey}-b`)}
        </div>
      </div>
    </div>
  );
};

const useTestimonialImages = () => {
  const [rows, setRows] = useState<{ rowOne: string[]; rowTwo: string[] }>({
    rowOne: fallbackRowOne,
    rowTwo: fallbackRowTwo,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await contentApi.getTestimonialImages();
        if (!data || data.length === 0) return;
        const urls = [...data].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.imageUrl);
        const mid = Math.ceil(urls.length / 2);
        setRows({ rowOne: urls.slice(0, mid), rowTwo: urls.slice(mid) });
      } catch {
        // Keep the static fallback images.
      }
    })();
  }, []);

  return rows;
};

const TestimonialsSection = () => {
  const bubbles = useMemo(() => generateBubbles(28), []);
  const { rowOne, rowTwo } = useTestimonialImages();

  return (
    <section
      id="testimonials"
      className="relative py-16 md:py-24 bg-background overflow-hidden"
    >
      {/* Floating emoji bubbles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {bubbles.map((b) => (
          <motion.span
            key={b.id}
            className="absolute bottom-0 select-none opacity-20"
            style={{ left: `${b.left}%`, fontSize: b.size }}
            animate={{
              y: ["0vh", "-110vh"],
              x: [0, 30, -20, 10, 0],
              rotate: [0, 15, -10, 5, 0],
            }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {b.emoji}
          </motion.span>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
            آراء عملائنا
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            ماذا يقول <span className="text-gradient-sky">أولياء الأمور</span>
          </h2>
          <p className="text-muted-foreground font-tajawal max-w-2xl mx-auto">
            نفخر بثقة أولياء الأمور في أكاديمية بنان ونسعى دائماً لتقديم أفضل تجربة تعليمية.
          </p>
        </motion.div>
      </div>

      {/* Two animated rows */}
      <div className="relative z-10 space-y-5 md:space-y-6">
        <Marquee images={rowOne} groupKey="row1" duration={70} />
        <Marquee images={rowTwo} groupKey="row2" reverse duration={80} />
      </div>
    </section>
  );
};

export default TestimonialsSection;
