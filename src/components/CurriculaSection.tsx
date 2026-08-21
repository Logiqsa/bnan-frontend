import { motion } from "framer-motion";
import { BookOpen, Calculator, FlaskConical, Languages, Palette } from "lucide-react";

const curricula = [
  {
    icon: "🇪🇬",
    title: "المنهج المصري",
    subjects: ["رياضيات", "علوم", "لغة عربية", "لغة إنجليزية", "دراسات"],
    color: "from-primary to-navy-light",
  },
  {
    icon: "🇸🇦",
    title: "المنهج السعودي",
    subjects: ["رياضيات", "علوم", "لغتي", "إنجليزي", "تربية إسلامية"],
    color: "from-secondary to-sky-light",
  },
  {
    icon: "🌍",
    title: "مناهج دولية",
    subjects: ["IGCSE", "SAT", "AP", "IB", "American Diploma"],
    color: "from-gold to-gold-light",
  },
];

const subjectIcons = [BookOpen, Calculator, FlaskConical, Languages, Palette];

const CurriculaSection = () => {
  return (
    <section id="curricula" className="py-24 bg-muted/40 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
            المناهج المتاحة
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            مناهج متنوعة <span className="text-gradient-sky">لكل الاحتياجات</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {curricula.map((curr, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="rounded-2xl overflow-hidden bg-card shadow-elegant border border-border/40 hover:scale-[1.02] transition-transform duration-300"
            >
              <div className={`p-6 bg-gradient-to-bl ${curr.color}`}>
                <span className="text-4xl">{curr.icon}</span>
                <h3 className="text-xl font-cairo font-bold mt-3 text-primary-foreground">
                  {curr.title}
                </h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {curr.subjects.map((subject, j) => {
                    const Icon = subjectIcons[j % subjectIcons.length];
                    return (
                      <li key={j} className="flex items-center gap-3 text-sm font-tajawal text-foreground">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {subject}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurriculaSection;
