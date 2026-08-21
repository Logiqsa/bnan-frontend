import { motion } from "framer-motion";
import { Eye, Target, HeartHandshake } from "lucide-react";

const items = [
  {
    icon: Eye,
    title: "رؤيتنا",
    description: "أن نكون المنصة التعليمية الأولى في العالم العربي.",
    gradient: "from-primary/20 to-secondary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Target,
    title: "رسالتنا",
    description: "تقديم تعليم رقمي عالي الجودة يسهّل متابعة المناهج بطريقة مرنة وسهلة.",
    gradient: "from-secondary/20 to-accent/20",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  {
    icon: HeartHandshake,
    title: "قيمنا",
    description: "جودة أكاديمية، متابعة شخصية للطالب، مرونة في المواعيد، أمان وسهولة في الاستخدام.",
    gradient: "from-accent/20 to-primary/20",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
];

const VisionMissionValues = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
            من نحن
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground">
            {"\n"}<span className="text-gradient-sky"></span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="group relative"
            >
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
              <div className="relative bg-card rounded-3xl border border-border/40 p-8 text-center shadow-elegant hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl ${item.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>
                <h3 className="text-xl font-cairo font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm font-tajawal text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisionMissionValues;
