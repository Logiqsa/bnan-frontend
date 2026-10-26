import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Users, BookOpen, ThumbsUp, Video } from "lucide-react";
import { useContactSettings, whatsappHref } from "@/contexts/ContactSettingsContext";
import AppStoreButtons from "@/components/AppStoreButtons";
import { useQuery } from "@tanstack/react-query";
import { homeStatisticsApi, type HomeStatisticKey } from "@/api/homeStatisticsApi";
const icons: Record<HomeStatisticKey, typeof Users> = { courses: BookOpen, teachers: Video, satisfaction: ThumbsUp, students: Users };
const positions = ["top-[18%] right-[2%]", "bottom-[22%] left-[1%]", "bottom-[8%] right-[2%]", "top-[15%] left-[1%]"];

const BrandDoubleUnderline = ({ className = "", emphasis = "soft" }: { className?: string; emphasis?: "soft" | "strong" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 200 18"
    preserveAspectRatio="none"
    className={`pointer-events-none absolute -bottom-1 left-0 h-3 w-full overflow-visible text-secondary ${className}`}
  >
    <path d={emphasis === "strong" ? "M4 12 C52 7, 145 2, 196 3" : "M4 8 C52 4, 145 3, 196 6"} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d={emphasis === "strong" ? "M12 17 C62 12, 143 7, 188 8" : "M12 15 C62 11, 143 10, 188 13"} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
  </svg>
);

const HeroSection = () => {
  const { settings } = useContactSettings();
  const statistics = useQuery({ queryKey: ["home-statistics"], queryFn: homeStatisticsApi.public, staleTime: 5 * 60_000 });
  const floatingBubbles = (statistics.data?.statistics || []).map((item, index) => ({ icon: icons[item.key], title: item.label, value: `${item.value.toLocaleString("ar-EG", { minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals })}${item.suffix}`, position: positions[index], delay: 0.6 + index * 0.2, floatDelay: `${index * 0.5}s` }));
  const whatsapp = settings.phones.find((phone) => phone.isWhatsapp && phone.isPrimary)
    || settings.phones.find((phone) => phone.isWhatsapp);
  return (
    <section className="relative flex min-h-[calc(100svh-5rem)] items-start overflow-hidden bg-[#f4f5f6] md:min-h-screen md:items-center">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55"
        style={{ backgroundImage: "url('/hero.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42),rgba(244,245,246,0.3)_48%,rgba(239,241,243,0.48))]" aria-hidden="true" />

      {/* Floating education emojis */}
      {[
        { emoji: "📚", position: "top-[12%] left-[8%] md:top-[15%] md:left-[15%]", size: "text-3xl md:text-5xl", delay: "0s" },
        { emoji: "🎓", position: "top-[8%] right-[10%] md:top-[10%] md:right-[20%]", size: "text-3xl md:text-6xl", delay: "1s" },
        { emoji: "🚀", position: "bottom-[35%] right-[5%] md:bottom-[30%] md:right-[15%]", size: "text-2xl md:text-5xl", delay: "2s" },
        { emoji: "✏️", position: "bottom-[25%] left-[5%] md:bottom-[20%] md:left-[12%]", size: "text-2xl md:text-5xl", delay: "0.5s" },
        { emoji: "🎒", position: "top-[40%] right-[2%] md:top-[45%] md:right-[3%]", size: "text-2xl md:text-4xl", delay: "1.5s" },
        { emoji: "💡", position: "bottom-[18%] right-[15%] md:bottom-[15%] md:right-[25%]", size: "text-2xl md:text-4xl", delay: "2.5s" },
        { emoji: "📖", position: "top-[45%] left-[2%] md:top-[50%] md:left-[3%]", size: "text-2xl md:text-5xl", delay: "0.8s" },
      ].map((item, i) => (
        <div
          key={i}
          className={`absolute ${item.position} ${item.size} opacity-45 md:opacity-55 animate-float pointer-events-none select-none`}
          style={{ animationDelay: item.delay }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Floating Bubbles - Desktop only (absolute positioned) */}
      {floatingBubbles.map((bubble, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: bubble.delay, type: "spring", stiffness: 100 }}
          className={`absolute ${bubble.position} z-20 hidden md:block`}
        >
          <div
            className="animate-float rounded-2xl border border-white/90 bg-white/88 px-5 py-3 shadow-[0_16px_35px_rgba(16,42,83,0.16)] backdrop-blur-md flex items-center gap-3"
            style={{ animationDelay: bubble.floatDelay }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
              <bubble.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-xs font-cairo text-slate-500">{bubble.title}</p>
              <p className="text-sm font-cairo font-bold text-primary">{bubble.value}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="container relative z-10 mx-auto px-4 pb-7 pt-20 sm:pt-24 md:-translate-y-10 md:pb-6 md:pt-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-6 text-[2.45rem] font-display font-bold leading-[1.28] text-primary drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] sm:text-5xl md:text-6xl md:leading-tight lg:text-7xl"
          >
            <span className="md:whitespace-nowrap">كل ما تحتاجه لرحلتك التعليمية</span>
            <br />
            <span className="relative inline-block pb-2 text-secondary">
              في مكان واحد
              <BrandDoubleUnderline emphasis="strong" />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-lg font-serif-text font-normal leading-relaxed text-slate-700 md:text-xl"
          >
            مع{" "}
            <span className="relative inline-block pb-1 font-bold text-secondary">
              بنان
              <BrandDoubleUnderline className="-bottom-1 h-2.5" emphasis="soft" />
            </span>{" "}
            خُض تجربة تعليمية تفاعلية متكاملة ترافق رحلتك نحو القمة خطوة بخطوة.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col justify-center gap-4 sm:flex-row"
          >
            <a href="/curricula">
              <Button size="lg" className="w-full bg-primary px-8 font-cairo text-lg text-primary-foreground shadow-[0_12px_24px_rgba(25,31,63,0.25)] hover:bg-navy-light sm:w-auto">
                ابدأ رحلتك التعليمية
              </Button>
            </a>
            {whatsapp && <a href={whatsappHref(whatsapp.value, "أريد حجز حصة مجانية")} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-2 border-primary/55 bg-white/70 px-8 font-cairo text-lg text-primary backdrop-blur-sm hover:bg-white sm:w-auto"
              >
                <Play className="w-5 h-5 ml-2" />
                اطلب حصة مجانية
              </Button>
            </a>}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mx-auto mt-6 w-full max-w-xs sm:mt-7 sm:max-w-sm"
          >
            <AppStoreButtons heroStyle className="grid-cols-2" />
          </motion.div>

          {/* Mobile Bubbles - in-flow grid below stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="mt-8 grid grid-cols-2 gap-3 md:hidden"
          >
            {floatingBubbles.map((bubble, i) => (
              <div
                key={i}
                className="animate-float flex items-center gap-2 rounded-xl border border-secondary/50 bg-secondary/15 px-3 py-2.5 shadow-[0_10px_22px_rgba(14,28,62,0.12)] backdrop-blur-md"
                style={{ animationDelay: bubble.floatDelay }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/25">
                  <bubble.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-cairo text-[10px] text-slate-500">{bubble.title}</p>
                  <p className="font-cairo text-xs font-bold text-primary">{bubble.value}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
