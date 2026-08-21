import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "الباقة الأساسية",
    price: "299",
    currency: "ر.س",
    period: "شهرياً",
    features: [
      "حصتان أسبوعياً",
      "متابعة دورية من المعلم",
      "تقارير أسبوعية للأداء",
      "واجبات منزلية",
    ],
    popular: false,
  },
  {
    name: "الباقة المتقدمة",
    price: "499",
    currency: "ر.س",
    period: "شهرياً",
    features: [
      "4 حصص أسبوعياً",
      "متابعة يومية من المعلم",
      "تقارير أسبوعية مفصّلة",
      "واجبات ومراجعات",
      "تسجيلات الحصص",
      "شهادات شهرية",
    ],
    popular: true,
  },
  {
    name: "الباقة المميزة",
    price: "799",
    currency: "ر.س",
    period: "شهرياً",
    features: [
      "حصص يومية (5 أسبوعياً)",
      "معلم خاص لكل مادة",
      "متابعة مستمرة وتقارير يومية",
      "واجبات ومراجعات مكثفة",
      "تسجيلات جميع الحصص",
      "شهادات تقدير شهرية",
      "أولوية في الدعم الفني",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
            الباقات والأسعار
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            اختر الباقة <span className="text-gradient-sky">المناسبة لك</span>
          </h2>
          <p className="text-muted-foreground font-tajawal max-w-2xl mx-auto">
            نقدّم باقات متنوعة تناسب جميع الاحتياجات التعليمية، مع إمكانية تخصيص الباقة حسب عدد المواد والحصص.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.popular
                  ? "bg-primary text-primary-foreground border-primary shadow-sky scale-105"
                  : "bg-card text-card-foreground border-border/40 shadow-elegant"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-4 flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-cairo font-bold">
                  <Star className="w-3 h-3" />
                  الأكثر طلباً
                </div>
              )}
              <h3 className="text-xl font-cairo font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-cairo font-bold">{plan.price}</span>
                <span className="text-sm opacity-80">{plan.currency} / {plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm font-tajawal">
                    <Check className={`w-4 h-4 shrink-0 ${plan.popular ? "text-secondary" : "text-accent"}`} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? "secondary" : "default"}
                className="w-full font-cairo"
                onClick={() => document.getElementById("curricula")?.scrollIntoView({ behavior: "smooth" })}
              >
                سجّل الآن
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
