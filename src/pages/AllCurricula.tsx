import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import PackagesSection from "@/components/PackagesSection";
import { catalogApi, type CurriculumOption } from "@/api/catalogApi";
import { ApiError } from "@/api/client";

const AllCurricula = () => {
  const navigate = useNavigate();
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [curriculumsLoading, setCurriculumsLoading] = useState(true);
  const [curriculumsError, setCurriculumsError] = useState("");

  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.curriculums()
      .then((result) => setCurriculums(result.data))
      .catch((value) => setCurriculumsError((value as ApiError).message || "تعذر تحميل المناهج."))
      .finally(() => setCurriculumsLoading(false));
  }, []);

  const handleCurriculumSelect = (id: string) => {
    setSelectedCurriculum(id);
  };

  const handleSubscribe = (packageId: string) => {
    navigate(`/register/student?curriculum=${selectedCurriculum}&package=${packageId}`);
  };

  const handleBackToGrid = () => {
    setSelectedCurriculum(null);
  };

  const selectedCurriculumLabel = curriculums.find((c) => c.id === selectedCurriculum)?.name ?? "";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="كل المناهج الدراسية"
        description="تعرّف على جميع المناهج الدراسية المتاحة في أكاديمية بنان واختر الباقة المناسبة لك."
        path="/curricula"
      />
      <Navbar />

      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          {!selectedCurriculum ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-cairo font-medium mb-4">
                  المناهج المتاحة
                </span>
                <h1 className="text-3xl md:text-5xl font-cairo font-bold text-foreground mb-4">
                  كل المناهج <span className="text-gradient-sky">الدراسية</span>
                </h1>
                <p className="text-muted-foreground font-tajawal max-w-2xl mx-auto">
                  في أكاديمية بنان نقدم مناهج دراسية متكاملة تغطي المراحل المختلفة في أكثر من دولة عربية، مع متابعة دقيقة وتفاعل مباشر بين المعلم والطالب.
                </p>
              </motion.div>

              {curriculumsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تحميل المناهج...
                </div>
              ) : curriculumsError ? (
                <p className="text-center text-destructive py-12">{curriculumsError}</p>
              ) : curriculums.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">لا توجد مناهج متاحة حاليًا</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {curriculums.map((c, index) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card rounded-2xl shadow-elegant border border-border/40 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-center py-8 bg-muted/30">
                        {c.icon && (
                          <img
                            src={c.icon}
                            alt={c.name}
                            className="w-24 h-24 object-contain rounded-md"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </div>
                      <div className="p-5 text-center">
                        <h3 className="text-lg font-cairo font-bold text-foreground mb-2">{c.name}</h3>
                        {c.description && (
                          <p className="text-sm font-tajawal text-muted-foreground leading-relaxed mb-4">
                            {c.description}
                          </p>
                        )}
                        <Button onClick={() => handleCurriculumSelect(c.id)} className="font-cairo gap-2">
                          تصفح القسم
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <PackagesSection
              curriculumLabel={selectedCurriculumLabel}
              curriculumId={selectedCurriculum}
              onBack={handleBackToGrid}
              onSubscribe={handleSubscribe}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AllCurricula;
