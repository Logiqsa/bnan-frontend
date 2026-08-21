import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const perks = [
  { icon: Users, text: "طلاب من مختلف الدول العربية" },
  { icon: Clock, text: "مرونة في اختيار المواعيد" },
  { icon: TrendingUp, text: "دخل مجزي ومستقر" },
  { icon: GraduationCap, text: "بيئة عمل احترافية" },
];

const JoinTeacherSection = React.forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();

  return (
    <section ref={ref} id="join-teacher" className="py-16 md:py-24 bg-hero-gradient text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-cairo font-medium mb-4">
              فرصة للمعلمين
            </span>
            <h2 className="text-3xl md:text-5xl font-cairo font-bold mb-4">
              انضم لفريق <span className="text-gradient-sky">أكاديمية بنان</span>
            </h2>
            <p className="font-tajawal text-primary-foreground/70 max-w-2xl mx-auto mb-10">
              إذا كنت معلماً متميزاً وتبحث عن فرصة للتدريس أونلاين، انضم لفريقنا وساهم في بناء مستقبل أفضل للطلاب.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10"
              >
                <perk.icon className="w-6 h-6 text-secondary" />
                <span className="text-xs font-tajawal text-primary-foreground/80 text-center">{perk.text}</span>
              </motion.div>
            ))}
          </div>

          <Button
            size="lg"
            className="font-cairo bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sky"
            onClick={() => navigate("/portal/teacher/signup")}
          >
            قدّم طلبك الآن
          </Button>
        </div>
      </div>
    </section>
  );
});

JoinTeacherSection.displayName = "JoinTeacherSection";

export default JoinTeacherSection;
