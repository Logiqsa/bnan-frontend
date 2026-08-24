import React from "react";
import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import AppStoreButtons from "@/components/AppStoreButtons";

const AppDownloadSection = React.forwardRef<HTMLElement>((_, ref) => {
  const { pick } = useLanguage();

  return (
    <section ref={ref} className="relative overflow-hidden bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-hero-gradient px-6 py-10 shadow-elegant md:px-12 md:py-14"
        >
          <div className="relative z-10 flex flex-col items-center justify-between gap-10 lg:flex-row">
            <div className="max-w-xl text-center lg:text-start">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-cairo text-white/80">
                <Smartphone className="h-4 w-4 text-secondary" />
                {pick("تعلّم من أي مكان", "Learn from anywhere")}
              </span>
              <h2 className="mb-4 text-3xl font-bold font-cairo text-white md:text-4xl">
                {pick("حمّل تطبيق أكاديمية بنان", "Download the BNAN Academy app")}
              </h2>
              <p className="text-lg leading-8 font-tajawal text-white/70">
                {pick("تابع دروسك وتواصل مع معلميك بسهولة، أينما كنت وفي أي وقت.", "Follow your lessons and connect with your teachers wherever you are.")}
              </p>
            </div>
            <AppStoreButtons onDark />
          </div>
        </motion.div>
      </div>
    </section>
  );
});

AppDownloadSection.displayName = "AppDownloadSection";
export default AppDownloadSection;
