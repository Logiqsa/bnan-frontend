import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpenCheck, GraduationCap, Rocket, Search, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CourseRegistrationDialog from "@/components/CourseRegistrationDialog";
import { PUBLISHED_COURSES, type Course } from "@/data/courses";
import defaultCover from "@/assets/course-default-cover.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const Courses = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [registerCourse, setRegisterCourse] = useState<Course | null>(null);
  const { isArabic, pick } = useLanguage();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return PUBLISHED_COURSES;
    return PUBLISHED_COURSES.filter(
      (c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    );
  }, [q]);

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-background">
      <SEO
        title={pick("الدورات التعليمية | BNAN Academy", "Courses | BNAN Academy")}
        description={pick("تصفّح الدورات التعليمية الاحترافية والتفاعلية في أكاديمية بنان وسجّل في الدورة المناسبة لك.", "Browse BNAN Academy's professional interactive courses and enroll in the right course for you.")}
        path="/courses"
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-28 md:pt-32 pb-8 md:pb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-cairo font-bold text-foreground">{pick("الدورات التعليمية", "Courses")}</h1>
          </div>
          <p className="text-muted-foreground font-tajawal">{pick("دورات احترافية وتفاعلية", "Professional and interactive courses")}</p>
        </div>

        {PUBLISHED_COURSES.length === 0 ? <div className="relative mx-auto mb-10 max-w-5xl overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary via-primary/95 to-[hsl(221_55%_24%)] px-6 py-8 text-primary-foreground shadow-elegant md:px-10 md:py-10">
          <div className="absolute -start-14 -top-16 h-44 w-44 rounded-full bg-secondary/20 blur-2xl" />
          <div className="absolute -bottom-20 end-4 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <Sparkles className="absolute end-7 top-6 h-6 w-6 text-secondary/80" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-start">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm">
              <BookOpenCheck className="h-10 w-10 text-secondary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                <Rocket className="h-3.5 w-3.5" />
                {pick("قريبًا", "Coming soon")}
              </span>
              <h2 className="text-2xl font-bold font-cairo md:text-3xl">{pick("تجربة دورات جديدة في الطريق إليك", "A new courses experience is on its way")}</h2>
              <p className="mt-3 max-w-2xl font-tajawal leading-7 text-white/70">{pick("نجهّز لك مجموعة دورات تعليمية تفاعلية بمعايير أكاديمية بنان. ترقّب الإطلاق قريبًا.", "We're preparing interactive learning experiences built to BNAN Academy standards. Stay tuned for launch.")}</p>
            </div>
          </div>
        </div> : <><div className="max-w-md mx-auto mb-8 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={pick("ابحث عن دورة...", "Search courses...")}
            className="pr-10 font-tajawal"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground font-tajawal">
              {pick("لا توجد دورات منشورة حالياً", "No courses are currently available")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img
                  src={c.cover_image_url || defaultCover}
                  alt={c.title}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
                <CardHeader>
                  <CardTitle className="font-cairo text-lg line-clamp-2">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground font-tajawal line-clamp-3 min-h-[60px]">
                    {c.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.grade_level && <Badge variant="outline">{c.grade_level}</Badge>}
                    {c.level && <Badge variant="outline">{c.level}</Badge>}
                    {c.certificate_enabled && <Badge variant="outline">🎓 {pick("شهادة", "Certificate")}</Badge>}
                  </div>
                  <p className="font-bold text-primary font-cairo">
                    {c.is_free ? pick("مجاني", "Free") : `${c.price} ${c.currency}`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/courses/${c.slug}`)}>
                      {pick("التفاصيل", "Details")}
                    </Button>
                    <Button className="flex-1" onClick={() => setRegisterCourse(c)}>
                      {pick("سجّل الآن", "Enroll now")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}</>}
      </main>

      <Footer />

      {registerCourse && (
        <CourseRegistrationDialog course={registerCourse} onClose={() => setRegisterCourse(null)} />
      )}
    </div>
  );
};

export default Courses;
