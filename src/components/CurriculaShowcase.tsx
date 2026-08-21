import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { catalogApi, type CurriculumOption } from "@/api/catalogApi";
import { ApiError } from "@/api/client";
import { useCurrency, CURRICULUM_CURRENCY } from "@/hooks/useCurrency";

const WHATSAPP_URL = "https://wa.me/+966582502026";

const mainCurricula = [
  {
    id: "saudi",
    flagUrl: "https://flagcdn.com/w160/sa.png",
    title: "المنهج السعودي",
    description: "نقدّم جميع المواد الدراسية للمرحلة الابتدائية، المتوسطة، والثانوية وفق المنهج المعتمد.",
  },
  {
    id: "egyptian",
    flagUrl: "https://flagcdn.com/w160/eg.png",
    title: "المنهج المصري",
    description: "تعليم متكامل للصفوف الابتدائية والإعدادية والثانوية وفق المنهج المصري الحديث.",
  },
  {
    id: "kuwaiti",
    flagUrl: "https://flagcdn.com/w160/kw.png",
    title: "المنهج الكويتي",
    description: "تعليم مبسّط وممتع مبني على المناهج الكويتية الرسمية.",
  },
];

const CurriculaShowcase = () => {
  const { setCurrency } = useCurrency();
  const [showAll, setShowAll] = useState(false);
  const [allCurricula, setAllCurricula] = useState<CurriculumOption[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadError, setLoadError] = useState("");

  const goToWhatsApp = () => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");

  const handleCurriculumSelect = (id: string) => {
    const cur = CURRICULUM_CURRENCY[id];
    if (cur) setCurrency(cur);
    goToWhatsApp();
  };

  const openAllCurricula = async () => {
    setShowAll(true);
    setLoadingAll(true);
    setLoadError("");
    try {
      const { data } = await catalogApi.curriculums();
      setAllCurricula(data);
    } catch (error) {
      setLoadError((error as ApiError).message || "تعذر تحميل المناهج.");
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <section id="curricula" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
            المناهج المتاحة
          </span>
          <h2 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
            مناهج دراسية <span className="text-gradient-sky">متكاملة</span>
          </h2>
          <p className="text-muted-foreground font-tajawal max-w-2xl mx-auto">
            في أكاديمية بنان نقدم مناهج دراسية متكاملة تغطي المراحل المختلفة في أكثر من دولة عربية، مع متابعة دقيقة وتفاعل مباشر بين المعلم والطالب.
          </p>
        </motion.div>

        {/* 3 Main Curricula Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {mainCurricula.map((c, index) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl shadow-elegant border border-border/40 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center py-8 bg-muted/30">
                <img src={c.flagUrl} alt={c.title} className="w-24 h-auto rounded-md shadow-md" />
              </div>
              <div className="p-5 text-center">
                <h3 className="text-lg font-cairo font-bold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm font-tajawal text-muted-foreground leading-relaxed mb-4">
                  {c.description}
                </p>
                <Button onClick={() => handleCurriculumSelect(c.id)} className="font-cairo gap-2">
                  تصفح القسم
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Browse More Button */}
        <div className="text-center mt-10">
          <Button variant="outline" size="lg" onClick={openAllCurricula} className="font-cairo gap-2">
            تصفح جميع المناهج
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>كل المناهج المتاحة</DialogTitle>
          </DialogHeader>
          {loadingAll ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري التحميل...
            </div>
          ) : loadError ? (
            <p className="text-center text-destructive py-6">{loadError}</p>
          ) : allCurricula.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لا توجد مناهج متاحة حاليًا</p>
          ) : (
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
              {allCurricula.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowAll(false);
                    goToWhatsApp();
                  }}
                  className="flex items-center justify-between rounded-xl border p-3 text-right hover:border-secondary hover:bg-muted/40 transition-colors font-cairo"
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.registrationMode === "egyptian" ? "مصري" : "سعودي/خليجي"}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CurriculaShowcase;
