import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalogApi, type PackageOption } from "@/api/catalogApi";
import { ApiError } from "@/api/client";

interface PackagesSectionProps {
  curriculumLabel: string;
  curriculumId: string;
  onBack: () => void;
  onSubscribe: (packageId: string) => void;
}

const PackagesSection = ({ curriculumLabel, curriculumId, onBack, onSubscribe }: PackagesSectionProps) => {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    catalogApi.packages(curriculumId)
      .then((result) => setPackages(result.data.filter((p) => p.isActive !== false)))
      .catch((value) => setError((value as ApiError).message || "تعذر تحميل الباقات."))
      .finally(() => setLoading(false));
  }, [curriculumId]);

  return (
    <div>
      <div className="flex items-center justify-end mb-8">
        <Button variant="ghost" onClick={onBack} className="font-cairo gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع للمناهج
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h3 className="text-2xl md:text-3xl font-cairo font-bold text-foreground">
          باقات <span className="text-gradient-sky">{curriculumLabel}</span>
        </h3>
        <p className="text-muted-foreground font-tajawal mt-2">اختر الباقة الأنسب لك واشترك مباشرة.</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري تحميل الباقات...
        </div>
      ) : error ? (
        <p className="text-center text-destructive py-12">{error}</p>
      ) : packages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-tajawal mb-4">سيتم إضافة باقات هذا المنهج قريبًا.</p>
          <Button variant="outline" onClick={onBack} className="font-cairo">
            رجوع للمناهج
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                pkg.isPopular
                  ? "bg-primary text-primary-foreground border-primary shadow-sky scale-105"
                  : "bg-card text-card-foreground border-border/40 shadow-elegant"
              }`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 right-4 flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-cairo font-bold">
                  <Star className="w-3 h-3" />
                  الأكثر طلباً
                </div>
              )}
              <h4 className="text-xl font-cairo font-bold mb-1">{pkg.name}</h4>
              {(pkg.hours || pkg.months) && (
                <p className={`text-sm font-tajawal mb-4 ${pkg.isPopular ? "opacity-90" : "text-muted-foreground"}`}>
                  {pkg.hours ? `${pkg.hours} ساعات` : `${pkg.months} شهر`}
                </p>
              )}
              <div className="flex items-baseline gap-2 mb-6">
                {pkg.oldPrice && (
                  <span className={`text-sm line-through ${pkg.isPopular ? "opacity-70" : "text-muted-foreground"}`}>
                    {pkg.oldPrice} {pkg.currency}
                  </span>
                )}
                <span className="text-3xl font-cairo font-bold">{pkg.price} {pkg.currency}</span>
              </div>
              <div className="flex-1" />
              <Button
                variant={pkg.isPopular ? "secondary" : "default"}
                className="w-full font-cairo"
                onClick={() => onSubscribe(pkg.id)}
              >
                اشترك الآن
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PackagesSection;
