import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";
import { coursesApi } from "@/api/coursesApi";
import { courseError, courseImageUrl } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import cover from "@/assets/course-default-cover.jpg";

export default function TeacherCourses() {
  const query = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: coursesApi.myTeachingCourses,
  });
  return (
    <DashboardLayout>
      <div className="space-y-5" dir="rtl">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/schedule">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>دوراتي</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-primary" />
            دوراتي
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الدورات والمجموعات المكلّف بتدريسها.
          </p>
        </div>
        {query.isLoading ? (
          <p className="py-12 text-center">جاري تحميل الدورات...</p>
        ) : query.error ? (
          <div className="rounded-xl border p-8 text-center text-destructive">
            {courseError(query.error)}
            <div>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => void query.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : !query.data?.length ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              لا توجد دورات مسندة إليك حاليًا.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.data.map(({ course, groups }) => (
              <Card key={course.id} className="overflow-hidden">
                <img
                  src={courseImageUrl(course.image) || cover}
                  alt={course.name}
                  className="h-36 w-full object-cover"
                />
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold">{course.name}</h2>
                    <Badge
                      variant={
                        course.status === "active" ? "default" : "secondary"
                      }
                    >
                      {course.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{groups.length} مجموعة</span>
                    <span>·</span>
                    <span>
                      {groups.reduce(
                        (total, group) => total + (group.studentsCount || 0),
                        0,
                      )}{" "}
                      طالب
                    </span>
                  </div>
                  {groups.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => (
                        <Button
                          key={group.id}
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link
                            to={`/portal/teacher/courses/${course.id}/groups/${group.id}`}
                          >
                            {group.name}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                  <Button className="w-full" asChild>
                    <Link to={`/portal/teacher/courses/${course.id}`}>
                      إدارة الدورة
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
