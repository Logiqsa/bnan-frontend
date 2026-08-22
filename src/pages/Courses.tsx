import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CourseRegistrationDialog from "@/components/CourseRegistrationDialog";
import { MOCK_COURSES, type Course } from "@/data/courses";
import defaultCover from "@/assets/course-default-cover.jpg";

const Courses = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [registerCourse, setRegisterCourse] = useState<Course | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return MOCK_COURSES;
    return MOCK_COURSES.filter(
      (c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    );
  }, [q]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SEO
        title="الدورات التعليمية | BNAN Academy"
        description="تصفّح الدورات التعليمية الاحترافية والتفاعلية في أكاديمية بنان وسجّل في الدورة المناسبة لك."
        path="/courses"
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-28 md:pt-32 pb-8 md:pb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-cairo font-bold text-foreground">الدورات التعليمية</h1>
          </div>
          <p className="text-muted-foreground font-tajawal">دورات احترافية وتفاعلية</p>
        </div>

        <div className="max-w-md mx-auto mb-8 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن دورة..."
            className="pr-10 font-tajawal"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground font-tajawal">
              لا توجد دورات منشورة حالياً
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
                    {c.certificate_enabled && <Badge variant="outline">🎓 شهادة</Badge>}
                  </div>
                  <p className="font-bold text-primary font-cairo">
                    {c.is_free ? "مجاني" : `${c.price} ${c.currency}`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/courses/${c.slug}`)}>
                      التفاصيل
                    </Button>
                    <Button className="flex-1" onClick={() => setRegisterCourse(c)}>
                      سجّل الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {registerCourse && (
        <CourseRegistrationDialog course={registerCourse} onClose={() => setRegisterCourse(null)} />
      )}
    </div>
  );
};

export default Courses;
