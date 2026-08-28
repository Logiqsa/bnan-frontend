import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CourseRegistrationDialog from "@/components/CourseRegistrationDialog";
import { PUBLISHED_COURSES } from "@/data/courses";
import defaultCover from "@/assets/course-default-cover.jpg";

const CourseDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const course = PUBLISHED_COURSES.find((c) => c.slug === slug);
  const [registering, setRegistering] = useState(false);

  if (!course) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl font-cairo font-bold mb-4">الدورة غير موجودة</h1>
          <Button asChild>
            <Link to="/courses">العودة لكل الدورات</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SEO title={`${course.title} | BNAN Academy`} description={course.description} path={`/courses/${course.slug}`} />
      <Navbar />

      <main className="container mx-auto px-4 pt-28 md:pt-32 pb-16 max-w-3xl">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowRight className="w-4 h-4" />
          العودة لكل الدورات
        </Link>

        <img
          src={course.cover_image_url || defaultCover}
          alt={course.title}
          className="w-full h-64 object-cover rounded-2xl mb-6"
        />

        <h1 className="text-2xl md:text-3xl font-cairo font-bold text-foreground mb-4">{course.title}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {course.grade_level && <Badge variant="outline">{course.grade_level}</Badge>}
          {course.level && <Badge variant="outline">{course.level}</Badge>}
          {course.certificate_enabled && <Badge variant="outline">🎓 شهادة</Badge>}
        </div>

        <p className="text-muted-foreground font-tajawal leading-relaxed mb-8">{course.description}</p>

        <div className="flex items-center justify-between bg-card border border-border/40 rounded-2xl p-5">
          <span className="text-2xl font-cairo font-bold text-primary">
            {course.is_free ? "مجاني" : `${course.price} ${course.currency}`}
          </span>
          <Button size="lg" onClick={() => setRegistering(true)} className="font-cairo">
            سجّل الآن
          </Button>
        </div>
      </main>

      <Footer />

      {registering && <CourseRegistrationDialog course={course} onClose={() => setRegistering(false)} />}
    </div>
  );
};

export default CourseDetails;
