import { motion } from "framer-motion";
import { UserCheck, GraduationCap, Users, ShieldCheck, Calculator, Settings } from "lucide-react";

const roles = [
  { icon: GraduationCap, title: "الطالب", description: "حضور الحصص، حل الواجبات، مشاهدة التسجيلات، متابعة الدرجات" },
  { icon: Users, title: "ولي الأمر", description: "متابعة مستوى الأبناء، التقارير الأسبوعية، التواصل مع المعلمين" },
  { icon: UserCheck, title: "المعلم", description: "إدارة الحصص، تصحيح الواجبات، إعداد التقييمات والتقارير" },
  { icon: ShieldCheck, title: "المشرف", description: "مراقبة الأداء العام، إدارة المعلمين، تقارير الجودة" },
  { icon: Calculator, title: "المحاسب", description: "إدارة المدفوعات، الفواتير، التقارير المالية، الخصومات" },
  { icon: Settings, title: "الأدمن", description: "إدارة كاملة للمنصة، الصلاحيات، الإعدادات العامة" },
];

const RolesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-primary text-sm font-cairo font-medium mb-4">
            أنواع الحسابات
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            نظام صلاحيات <span className="text-gradient-sky">متقدم</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {roles.map((role, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-4 p-5 rounded-2xl bg-card border border-border/40 hover:shadow-elegant hover:border-secondary/30 transition-all duration-300"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center">
                <role.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-cairo font-bold text-foreground mb-1">{role.title}</h3>
                <p className="text-sm font-tajawal text-muted-foreground leading-relaxed">{role.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
