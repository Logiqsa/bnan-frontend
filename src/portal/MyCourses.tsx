import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { coursesApi, type Course } from "@/api/coursesApi";
import { courseError, courseImageUrl, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import cover from "@/assets/course-default-cover.jpg";

export default function MyCourses() {
  const query = useQuery({ queryKey: ["my-course-enrollments"], queryFn: coursesApi.myEnrollments });
  const publicCoursesQuery = useQuery({ queryKey: ["courses", "public"], queryFn: coursesApi.listPublic });
  return <DashboardLayout><div className="space-y-5">
    <div><h1 className="text-2xl font-bold">دوراتي</h1><p className="text-sm text-muted-foreground">يعتمد الوصول إلى الفصل على حالة التسجيل الفعلية.</p></div>
    {query.isLoading ? <p>جاري التحميل...</p> : query.error ? <div className="rounded-xl border p-6 text-destructive">{courseError(query.error)}</div> : !query.data?.length ? <Card><CardContent className="p-10 text-center"><p className="mb-4 text-muted-foreground">لم تسجل في أي دورة بعد.</p><Button asChild><Link to="/courses">استعراض الدورات</Link></Button></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{query.data.map((enrollment) => {
      const course = typeof enrollment.course === "object" ? enrollment.course as Course : null;
      const group = typeof enrollment.group === "object" ? enrollment.group : null;
      const classroom = typeof enrollment.classroom === "object" ? enrollment.classroom : typeof group?.classroom === "object" ? group.classroom : null;
      const publicCourse = publicCoursesQuery.data?.find((item) => item.id === course?.id);
      const teacherName = course && (typeof course.teacher === "string" && /^[a-f\d]{24}$/i.test(course.teacher)
        ? refName(publicCourse?.teacher)
        : refName(course.teacher));
      return <Card key={enrollment.id}><CardContent className="flex gap-4 p-5">
        <img src={courseImageUrl(course?.image) || cover} className="h-24 w-24 rounded-lg object-cover" alt="" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-bold">{course?.name || refName(typeof enrollment.course === "object" ? enrollment.course : null)}</h2>
          <div className="flex gap-2"><Badge>{enrollment.mode === "group" ? "جماعي" : "فردي"}</Badge><Badge variant={enrollment.status === "active" ? "default" : "secondary"}>{enrollment.status}</Badge></div>
          {course && <p className="text-sm text-muted-foreground">المعلم: {teacherName}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild><Link to={`/portal/student/courses/${enrollment.id}`}>عرض التفاصيل</Link></Button>
            {enrollment.status === "active" && classroom && <Button size="sm" asChild><Link to={`/portal/student/courses/${enrollment.id}#course-schedule`}>جدول {classroom.name}</Link></Button>}
          </div>
        </div>
      </CardContent></Card>;
    })}</div>}
  </div></DashboardLayout>;
}
