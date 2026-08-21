import React from "react";
import { motion } from "framer-motion";
import {
  Video, FileText, Award, ClipboardCheck,
  BarChart3, CreditCard, Brain, Globe,
} from "lucide-react";

const features = [
  { icon: Video, title: "حصص مباشرة عبر Zoom", description: "حصص تفاعلية مباشرة يتم تسجيلها لإمكانية مشاهدتها لاحقًا" },
  { icon: ClipboardCheck, title: "تقييم أسبوعي", description: "متابعة دورية لمستوى الطالب مع تقارير مفصلة للأهل" },
  { icon: Award, title: "شهادات شهرية", description: "شهادات تقدير تُمنح للطلاب المتميزين شهرياً" },
  { icon: FileText, title: "نظام واجبات متكامل", description: "رفع واستلام الواجبات إلكترونياً مع التصحيح الفوري" },
  { icon: BarChart3, title: "تقارير مالية ذكية", description: "نظام محاسبي شامل مع دعم تعدد العملات والخصومات" },
  { icon: CreditCard, title: "دفع مرن", description: "خيارات دفع متعددة تناسب جميع العملاء مع دعم تعدد العملات" },
  { icon: Brain, title: "تقارير بالذكاء الاصطناعي", description: "ملخصات ذكية لمحتوى الحصص وتوصيات مخصصة لكل طالب" },
  { icon: Globe, title: "منصة ثنائية اللغة", description: "دعم كامل للعربية والإنجليزية مع واجهة سلسة" },
];

const FeaturesSection = React.forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} id="features" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-secondary/5 blur-3xl" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-primary text-sm font-cairo font-medium mb-4">
            المميزات
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            كل ما تحتاجه في <span className="text-gradient-sky">منصة واحدة</span>
          </h2>
          <p className="text-muted-foreground font-tajawal max-w-xl mx-auto">
            نظام متكامل يربط بين الطالب والمعلم وولي الأمر والإدارة بسلاسة تامة
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-6 rounded-2xl bg-card border border-border/40 hover:shadow-elegant hover:border-secondary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-sky-gradient group-hover:shadow-sky transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-secondary-foreground transition-colors" />
              </div>
              <h3 className="text-lg font-cairo font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm font-tajawal text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";

export default FeaturesSection;
