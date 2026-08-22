import { motion } from "framer-motion";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL = "https://wa.me/+966582502026?text=" + encodeURIComponent("مرحبًا، أرغب في الاستفسار عن أكاديمية بنان.");

const contactInfo = [
  {
    icon: Phone,
    title: "اتصل بنا",
    value: "+966 58 250 2026",
    href: "tel:+966582502026",
    subtitle: "متاح 24/7",
  },
  {
    icon: Phone,
    title: "خط إضافي",
    value: "+966 53 080 8189",
    href: "tel:+966530808189",
    subtitle: "خط إضافي",
  },
  {
    icon: MessageCircle,
    title: "واتساب",
    value: "+966 58 250 2026",
    href: "https://wa.me/+966582502026",
  },
  {
    icon: Mail,
    title: "البريد الإلكتروني",
    value: "info@bnanacademysa.com",
    href: "mailto:info@bnanacademysa.com",
  },
  {
    icon: MapPin,
    title: "العنوان",
    value: "الرياض، المملكة العربية السعودية",
  },
];

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="تواصل معنا | BNAN Academy"
        description="تواصل مع أكاديمية بنان عبر الهاتف أو الواتساب أو البريد الإلكتروني، فريقنا جاهز لمساعدتك."
        path="/contact"
      />
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
              تواصل معنا
            </span>
            <h1 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
              نحن هنا <span className="text-gradient-sky">لمساعدتك</span>
            </h1>
            <p className="text-muted-foreground font-tajawal max-w-2xl mx-auto">
              فريق أكاديمية بنان جاهز للإجابة على استفساراتك ومساعدتك في اختيار المسار التعليمي المناسب.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-5">
              {contactInfo.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl border border-border/40 shadow-elegant p-5 flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-cairo font-bold text-foreground">{item.title}</p>
                    {item.href ? (
                      <a href={item.href} dir="ltr" className="text-primary hover:underline block">
                        {item.value}
                      </a>
                    ) : (
                      <p dir="ltr" className="text-foreground">{item.value}</p>
                    )}
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-hero-gradient rounded-2xl p-8 flex flex-col justify-center items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-5">
                <MessageCircle className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-cairo font-bold text-primary-foreground mb-2">
                تحتاج مساعدة فورية؟
              </h3>
              <p className="text-primary-foreground/70 font-tajawal mb-6">
                تواصل معنا مباشرة عبر واتساب وسيقوم فريقنا بالرد عليك في أقرب وقت.
              </p>
              <Button size="lg" asChild className="font-cairo bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  تواصل عبر واتساب
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
