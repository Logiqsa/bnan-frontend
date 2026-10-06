import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Users, BookOpen, Phone, Tag, GraduationCap, Smartphone } from "lucide-react";
import { useContactSettings, whatsappHref } from "@/contexts/ContactSettingsContext";
import { useLanguage } from "@/i18n/LanguageContext";
import AppStoreButtons from "@/components/AppStoreButtons";

const floatingBubbles = [
  {
    icon: Users,
    title: "الطلاب المسجّلون",
    value: "+5k",
    position: "top-[18%] right-[2%]",
    delay: 0.6,
    floatDelay: "0s",
  },
  {
    icon: Phone,
    title: "خدمات الدعم الإلكتروني",
    value: "24/7",
    position: "bottom-[22%] left-[1%]",
    delay: 0.8,
    floatDelay: "1s",
  },
  {
    icon: Tag,
    title: "خصم 20%",
    value: "لجميع الكورسات",
    position: "bottom-[8%] right-[2%]",
    delay: 1.0,
    floatDelay: "2s",
  },
  {
    icon: GraduationCap,
    title: "معلم متخصص",
    value: "+200",
    position: "top-[15%] left-[1%]",
    delay: 1.2,
    floatDelay: "0.5s",
  },
];

const HeroSection = () => {
  const { settings } = useContactSettings();
  const { pick } = useLanguage();
  const whatsapp = settings.phones.find((phone) => phone.isWhatsapp && phone.isPrimary)
    || settings.phones.find((phone) => phone.isWhatsapp);
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />

      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-secondary/10 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

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
          className={`absolute ${item.position} ${item.size} opacity-30 md:opacity-40 animate-float pointer-events-none select-none`}
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
            className="animate-float bg-card/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-elegant border border-border/20 flex items-center gap-3"
            style={{ animationDelay: bubble.floatDelay }}
          >
            <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
              <bubble.icon className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-right">
              <p className="text-xs font-cairo text-muted-foreground">{bubble.title}</p>
              <p className="text-sm font-cairo font-bold text-foreground">{bubble.value}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-cairo font-extrabold leading-tight mb-6 text-primary-foreground"
          >
            تعليم احترافي
            <br />
            <span className="text-gradient-sky">بلا حدود</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl font-tajawal mb-8 max-w-2xl mx-auto text-primary-foreground/70"
          >
            BNAN Academy منصة تعليم إلكتروني متكاملة تجمع بين أفضل المعلمين والتكنولوجيا الحديثة لتقديم تجربة تعليم عن بعد فريدة لأبنائكم
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="/curricula">
              <Button size="lg" className="font-cairo text-lg bg-secondary text-secondary-foreground shadow-sky hover:bg-secondary/90 px-8">
                ابدأ رحلتك التعليمية
              </Button>
            </a>
            {whatsapp && <a href={whatsappHref(whatsapp.value, "أريد حجز حصة مجانية")} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="font-cairo text-lg border-2 border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 px-8 backdrop-blur-sm"
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
            className="mx-auto mt-8 w-full max-w-2xl rounded-[1.5rem] bg-white/10 p-4 text-start shadow-elegant backdrop-blur-md md:p-5"
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0 text-center sm:text-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-cairo text-white/80">
                  <Smartphone className="h-3.5 w-3.5 text-secondary" />
                  {pick("تعلّم من أي مكان", "Learn from anywhere")}
                </span>
                <h2 className="mt-2 text-lg font-bold font-cairo text-white md:text-xl">
                  {pick("حمّل تطبيق أكاديمية بنان", "Download the BNAN Academy app")}
                </h2>
                <p className="mt-1 text-sm font-tajawal text-white/70">
                  {pick("تابع دروسك بسهولة من أي مكان", "Follow your lessons wherever you are")}
                </p>
              </div>
              <AppStoreButtons onDark compact className="max-w-[19rem] shrink-0 sm:w-[19rem]" />
            </div>
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
                className="animate-float bg-card/90 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-elegant border border-border/20 flex items-center gap-2"
                style={{ animationDelay: bubble.floatDelay }}
              >
                <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                  <bubble.icon className="w-4 h-4 text-secondary" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-cairo text-muted-foreground">{bubble.title}</p>
                  <p className="text-xs font-cairo font-bold text-foreground">{bubble.value}</p>
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
