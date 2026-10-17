import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Users, BookOpen, ThumbsUp, Video } from "lucide-react";
import { useContactSettings, whatsappHref } from "@/contexts/ContactSettingsContext";
import AppStoreButtons from "@/components/AppStoreButtons";
import { useQuery } from "@tanstack/react-query";
import { homeStatisticsApi, type HomeStatisticKey } from "@/api/homeStatisticsApi";
const icons: Record<HomeStatisticKey, typeof Users> = { courses: BookOpen, teachers: Video, satisfaction: ThumbsUp, students: Users };
const positions = ["top-[18%] right-[2%]", "bottom-[22%] left-[1%]", "bottom-[8%] right-[2%]", "top-[15%] left-[1%]"];

const HeroSection = () => {
  const { settings } = useContactSettings();
  const statistics = useQuery({ queryKey: ["home-statistics"], queryFn: homeStatisticsApi.public, staleTime: 5 * 60_000 });
  const floatingBubbles = (statistics.data?.statistics || []).map((item, index) => ({ icon: icons[item.key], title: item.label, value: `${item.value.toLocaleString("ar-EG", { minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals })}${item.suffix}`, position: positions[index], delay: 0.6 + index * 0.2, floatDelay: `${index * 0.5}s` }));
  const whatsapp = settings.phones.find((phone) => phone.isWhatsapp && phone.isPrimary)
    || settings.phones.find((phone) => phone.isWhatsapp);
  return (
    <section className="relative min-h-screen flex items-start md:items-center overflow-hidden bg-[#f7f8fa]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-white/35" aria-hidden="true" />

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
            className="animate-float rounded-2xl border border-white/90 bg-white/85 px-5 py-3 shadow-[0_16px_35px_rgba(16,42,83,0.16)] backdrop-blur-md flex items-center gap-3"
            style={{ animationDelay: bubble.floatDelay }}
          >
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
              <bubble.icon className="w-5 h-5 text-sky-700" />
            </div>
            <div className="text-right">
              <p className="text-xs font-cairo text-slate-500">{bubble.title}</p>
              <p className="text-sm font-cairo font-bold text-[#102a53]">{bubble.value}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="container mx-auto px-4 relative z-10 pt-6 md:-translate-y-10 md:pt-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 text-[#102a53] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]"
          >
            <span className="md:whitespace-nowrap">كل ما تحتاجه لرحلتك التعليمية</span>
            <br />
            <span className="text-sky-600">
              في مكان واحد
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl font-serif-text font-normal mb-8 max-w-2xl mx-auto text-slate-700"
          >
            مع{" "}
            <span className="font-bold text-sky-700">بنان</span>{" "}
            خُض تجربة تعليمية تفاعلية متكاملة ترافق رحلتك نحو القمة خطوة بخطوة.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="/curricula">
              <Button size="lg" className="font-cairo text-lg bg-[#102a53] text-white shadow-[0_12px_24px_rgba(16,42,83,0.25)] hover:bg-[#183969] px-8">
                ابدأ رحلتك التعليمية
              </Button>
            </a>
            {whatsapp && <a href={whatsappHref(whatsapp.value, "أريد حجز حصة مجانية")} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="font-cairo text-lg border-2 border-[#102a53]/35 text-[#102a53] bg-white/70 hover:bg-white px-8 backdrop-blur-sm"
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
            className="mx-auto mt-8 w-full max-w-md"
          >
            <AppStoreButtons heroStyle className="max-w-md grid-cols-1 sm:grid-cols-2" />
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
                className="animate-float rounded-xl border border-white/90 bg-white/85 px-3 py-2.5 shadow-[0_12px_28px_rgba(16,42,83,0.14)] backdrop-blur-md flex items-center gap-2"
                style={{ animationDelay: bubble.floatDelay }}
              >
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                  <bubble.icon className="w-4 h-4 text-sky-700" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-cairo text-slate-500">{bubble.title}</p>
                  <p className="text-xs font-cairo font-bold text-[#102a53]">{bubble.value}</p>
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
