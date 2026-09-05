import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Clock3, UserRound } from "lucide-react";
import { coursesApi } from "@/api/coursesApi";
import {
  courseError,
  courseImageUrl,
  isFreeCourse,
  refName,
} from "@/lib/courseUi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseRegistrationDialog from "@/components/CourseRegistrationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import cover from "@/assets/course-default-cover.jpg";

export default function CourseDetails() {
  const { slug = "" } = useParams();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["public-course", slug],
    queryFn: () => coursesApi.getPublic(slug),
  });
  const course = query.data;
  const free = course ? isFreeCourse(course) : false;
  const duration = course
    ? course.durationHours ||
      course.requiredDuration ||
      (course.requiredMinutes ? course.requiredMinutes / 60 : undefined)
    : undefined;

  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pb-16 pt-28">
        <Link
          to="/courses"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" />
          كل الدورات
        </Link>
        {query.isLoading ? (
          <p className="py-20 text-center">جاري التحميل...</p>
        ) : query.error ? (
          <p className="py-20 text-center text-destructive">
            {courseError(query.error)}
          </p>
        ) : (
          course && (
            <>
              <div
                className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
                dir="ltr"
              >
                <img
                  src={courseImageUrl(course.image) || cover}
                  alt={course.name}
                  className="h-full min-h-80 w-full rounded-2xl border bg-card object-cover shadow-sm"
                />
                <div className="space-y-4" dir="rtl">
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <h1 className="text-3xl font-bold">{course.name}</h1>
                        {free && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            مجانية
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserRound className="h-4 w-4" />
                            المعلم
                          </p>
                          <p className="mt-2 font-bold">
                            {refName(course.teacher)}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            المادة
                          </p>
                          <p className="mt-2 font-bold">
                            {refName(course.subject)}
                          </p>
                        </div>
                        {duration && (
                          <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock3 className="h-4 w-4" />
                              مدة الدورة
                            </p>
                            <p className="mt-2 font-bold">{duration} ساعة</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="mb-3 text-lg font-bold">عن الدورة</h2>
                      <p className="whitespace-pre-wrap leading-8 text-muted-foreground">
                        {course.description}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      {!free && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {course.enrollmentModes.group.enabled && (
                            <div className="rounded-xl border p-4">
                              <p className="text-xs text-muted-foreground">
                                التسجيل الجماعي
                              </p>
                              <p className="mt-1 text-lg font-bold">
                                {course.enrollmentModes.group.price}{" "}
                                {course.currency}
                              </p>
                            </div>
                          )}
                          {course.enrollmentModes.individual.enabled && (
                            <div className="rounded-xl border p-4">
                              <p className="text-xs text-muted-foreground">
                                التسجيل الفردي
                              </p>
                              <p className="mt-1 text-lg font-bold">
                                {course.enrollmentModes.individual.price}{" "}
                                {course.currency}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={!course.enrollmentOpen}
                        onClick={() => setOpen(true)}
                      >
                        {course.enrollmentOpen
                          ? free
                            ? "سجّل مجانًا"
                            : "اختيار نمط التسجيل"
                          : "التسجيل مغلق"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {open && (
                <CourseRegistrationDialog
                  course={course}
                  onClose={() => setOpen(false)}
                />
              )}
            </>
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
