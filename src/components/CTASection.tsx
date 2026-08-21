import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CTASection = React.forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-cairo font-bold mb-6 text-primary-foreground">
            ابدأ رحلة التعلم <span className="text-gradient-sky">اليوم</span>
          </h2>
          <p className="text-lg font-tajawal mb-8 text-primary-foreground/70">
            انضم إلى آلاف الطلاب الذين يثقون في BNAN Academy لتحقيق التفوق الدراسي
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/portal/teacher/signup">
              <Button size="lg" className="font-cairo text-lg bg-secondary text-secondary-foreground shadow-sky hover:bg-secondary/90 px-10">
                سجل كمعلم
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </a>
          </div>
          <p className="text-sm font-tajawal mt-4 text-primary-foreground/60">
            تسجيل الطلاب متاح عبر تطبيق أكاديمية بنان
          </p>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
