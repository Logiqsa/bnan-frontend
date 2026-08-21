import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, ThumbsUp, Video, BookOpen } from "lucide-react";

const stats = [
  { icon: BookOpen, value: 300, suffix: "+", label: "كورس متاح" },
  { icon: Video, value: 120, suffix: "+", label: "معلم معتمد" },
  { icon: ThumbsUp, value: 98, suffix: "%", label: "نسبة الرضا" },
  { icon: Users, value: 5.6, suffix: " ألف", label: "طالب ملتحق", decimals: 1 },
];

function useCountUp(target: number, duration = 2000, decimals = 0, inView = false) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, decimals, inView]);

  return count;
}

const StatCard = ({ icon: Icon, value, suffix, label, decimals = 0, index }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const count = useCountUp(value, 2000, decimals, inView);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 p-6 text-center shadow-elegant hover:shadow-lg transition-all"
    >
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="text-3xl md:text-4xl font-cairo font-bold text-foreground mb-1">
        {count}{suffix}
      </div>
      <p className="text-sm font-tajawal text-muted-foreground">{label}</p>
    </motion.div>
  );
};

const StatsCounter = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
