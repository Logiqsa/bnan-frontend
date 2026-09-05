import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Eye, Pencil, Plus, Users } from "lucide-react";
import { coursesApi } from "@/api/coursesApi";
import { courseStaffApi } from "@/api/courseStaffApi";
import { courseError, courseImageUrl, refId, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import cover from "@/assets/course-default-cover.jpg";

const flag = (yes: boolean, active: string, inactive: string) => (
  <Badge variant={yes ? "default" : "secondary"}>
    {yes ? active : inactive}
  </Badge>
);

export default function CoursesAdmin() {
  const queryClient = useQueryClient();
  const courses = useQuery({
    queryKey: ["admin-courses"],
    queryFn: coursesApi.listAdmin,
  });
  const staff = useQuery({
    queryKey: ["course-admin-staff-names"],
    queryFn: async () => {
      const [teachers, supervisors] = await Promise.all([
        courseStaffApi.teachers(),
        courseStaffApi.supervisors(),
      ]);
      return [...teachers, ...supervisors];
    },
  });
  const staffName = (value: Parameters<typeof refId>[0]) => {
    const id = refId(value);
    const resolved = staff.data?.find(
      (item) => item.id === id || item.userId === id,
    )?.name;
    if (resolved) return resolved;
    const populatedName = refName(value);
    return typeof value !== "string" && populatedName !== "—"
      ? populatedName
      : "غير متاح";
  };
  const publish = useMutation({
    mutationFn: ({
      id,
      isPublished,
    }: {
      id: string;
      isPublished: boolean;
    }) => coursesApi.setPublished(id, isPublished),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["admin-courses"],
        (current: typeof courses.data) =>
          current?.map((course) =>
            course.id === updated.id ? { ...course, ...updated } : course,
          ),
      );
      toast.success(updated.isPublished ? "تم نشر الدورة" : "تم إلغاء نشر الدورة");
    },
    onError: (error) => toast.error(courseError(error)),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-cairo text-2xl font-bold">إدارة الدورات</h1>
            <p className="text-sm text-muted-foreground">
              المنتج وإعدادات التسجيل الجماعي والفردي
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/courses/new">
              <Plus className="me-2 h-4 w-4" />
              دورة جديدة
            </Link>
          </Button>
        </div>
        {courses.isLoading ? (
          <p className="py-12 text-center">جاري التحميل...</p>
        ) : courses.error ? (
          <div className="rounded-xl border p-8 text-center text-destructive">
            {courseError(courses.error)}{" "}
            <Button variant="outline" onClick={() => courses.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : !courses.data?.length ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              لا توجد دورات بعد.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {courses.data.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <img
                  src={courseImageUrl(course.image) || cover}
                  alt={course.name}
                  className="h-32 w-full object-cover"
                />
                <CardHeader className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-2">
                      {course.name}
                    </CardTitle>
                    <Badge variant="outline">{course.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {flag(!!course.isPublished, "منشورة", "مسودة")}
                    {flag(
                      course.enrollmentOpen,
                      "التسجيل مفتوح",
                      "التسجيل مغلق",
                    )}
                  </div>
                  <label className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {course.isPublished ? "منشورة" : "غير منشورة"}
                    </span>
                    <Switch
                      checked={!!course.isPublished}
                      disabled={
                        publish.isPending && publish.variables?.id === course.id
                      }
                      onCheckedChange={(isPublished) =>
                        publish.mutate({ id: course.id, isPublished })
                      }
                      aria-label={
                        course.isPublished
                          ? "إلغاء نشر الدورة"
                          : "نشر الدورة"
                      }
                    />
                  </label>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">المعلم</p>
                    <p className="font-medium">
                      {staff.isLoading
                        ? "جاري تحميل الاسم..."
                        : staffName(course.teacher)}
                    </p>
                    {course.supervisor && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        المشرف: {staffName(course.supervisor)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      الصفوف المؤهلة
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {course.eligibleGrades.map((grade) => (
                        <Badge key={refId(grade)} variant="secondary">
                          {refName(grade)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">جماعي</p>
                      <b>
                        {course.enrollmentModes.group.enabled
                          ? `${course.enrollmentModes.group.price} ${course.currency}`
                          : "معطل"}
                      </b>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">فردي</p>
                      <b>
                        {course.enrollmentModes.individual.enabled
                          ? `${course.enrollmentModes.individual.price} ${course.currency}`
                          : "معطل"}
                      </b>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-3 gap-1.5 border-t bg-muted/20 p-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/courses/${course.id}`}>
                      <Eye className="me-1 h-4 w-4" />
                      عرض
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/courses/${course.id}/groups`}>
                      <Users className="me-1 h-4 w-4" />
                      المجموعات
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to={`/admin/courses/${course.id}/edit`}>
                      <Pencil className="me-1 h-4 w-4" />
                      تعديل
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
