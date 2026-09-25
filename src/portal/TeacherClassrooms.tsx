import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, RefreshCw, School, Users } from "lucide-react";
import { teacherClassroomsApi, type ClassroomRegistrationMode } from "@/api/teacherClassroomsApi";
import { coursesApi } from "@/api/coursesApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";

export interface TeacherClassroomItem {
  classroomId: string;
  classroomName: string;
  source: "regular" | "course";
  registrationMode?: ClassroomRegistrationMode;
  courseId?: string;
  courseName?: string;
  groupId?: string;
  groupName?: string;
  studentsCount?: number;
}

const classroomReference = (value: unknown) => {
  if (typeof value === "string") return { id: value, name: undefined };
  if (!value || typeof value !== "object") return { id: "", name: undefined };
  const classroom = value as { id?: string; _id?: string; name?: string };
  return { id: classroom.id || classroom._id || "", name: classroom.name };
};

export default function TeacherClassrooms() {
  const { pick } = useLanguage();
  const regular = useQuery({
    queryKey: ["teacher-classrooms"],
    queryFn: teacherClassroomsApi.listMine,
    staleTime: 30_000,
    retry: 1,
  });
  const courses = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: coursesApi.myTeachingCourses,
    staleTime: 30_000,
    retry: 1,
  });

  const classrooms = useMemo(() => {
    const items = new Map<string, TeacherClassroomItem>();
    (regular.data || []).forEach((classroom) => {
      items.set(classroom.classroomId, {
        classroomId: classroom.classroomId,
        classroomName: classroom.classroomName,
        source: "regular",
        registrationMode: classroom.registrationMode,
      });
    });
    (courses.data || []).forEach(({ course, groups }) => {
      groups.forEach((group) => {
        const classroom = classroomReference(group.classroom);
        if (!classroom.id) return;
        const existing = items.get(classroom.id);
        items.set(classroom.id, {
          classroomId: classroom.id,
          classroomName: classroom.name || existing?.classroomName || group.name,
          source: "course",
          registrationMode: existing?.registrationMode,
          courseId: course.id,
          courseName: course.name,
          groupId: group.id,
          groupName: group.name,
          studentsCount: typeof group.studentsCount === "number" ? group.studentsCount : existing?.studentsCount,
        });
      });
    });
    return [...items.values()].sort((a, b) => a.classroomName.localeCompare(b.classroomName, "ar"));
  }, [courses.data, regular.data]);

  const bothFailed = regular.isError && courses.isError;
  const initialLoading = classrooms.length === 0 && (regular.isPending || courses.isPending);
  const partialFailure = !bothFailed && (regular.isError || courses.isError);
  const retry = () => void Promise.all([regular.refetch(), courses.refetch()]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <School className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pick("الفصول", "Classrooms")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{pick("الفصول والمجموعات المسندة إليك", "Classrooms and groups assigned to you")}</p>
            </div>
          </div>
        </header>

        {partialFailure && (
          <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>{regular.isError ? pick("تعذر تحميل بعض الفصول العادية، وتظهر البيانات المتاحة.", "Some regular classrooms could not be loaded. Available data is shown.") : pick("تعذر تحميل بعض فصول الدورات، وتظهر البيانات المتاحة.", "Some course classrooms could not be loaded. Available data is shown.")}</span>
            <Button size="sm" variant="outline" onClick={retry} disabled={regular.isFetching || courses.isFetching}><RefreshCw className="me-2 h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button>
          </div>
        )}

        {initialLoading ? (
          <div className="space-y-4" aria-label={pick("جاري تحميل الفصول...", "Loading classrooms...")}>
            <p className="text-sm text-muted-foreground">{pick("جاري تحميل الفصول...", "Loading classrooms...")}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-48 rounded-xl" />)}</div>
          </div>
        ) : bothFailed ? (
          <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><p className="text-destructive">{pick("تعذر تحميل الفصول.", "Unable to load classrooms.")}</p><Button variant="outline" onClick={retry} disabled={regular.isFetching || courses.isFetching}><RefreshCw className="me-2 h-4 w-4" />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
        ) : classrooms.length === 0 ? (
          <Card><CardContent className="flex min-h-64 items-center justify-center p-6 text-center text-muted-foreground">{pick("لا توجد فصول مسندة إليك.", "No classrooms are assigned to you.")}</CardContent></Card>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={pick("الفصول المسندة", "Assigned classrooms")}>
            {classrooms.map((classroom) => (
              <Card key={classroom.classroomId} className="group overflow-hidden transition-shadow hover:shadow-md">
                <Link to={`/portal/teacher/classrooms/${encodeURIComponent(classroom.classroomId)}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <CardContent className="flex h-full min-w-0 flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><School className="h-5 w-5" /></span>
                      <div className="flex flex-wrap justify-end gap-2">
                        {classroom.registrationMode && <Badge variant="secondary">{classroom.registrationMode === "gulf" ? pick("خليجي", "Gulf") : pick("مصري", "Egyptian")}</Badge>}
                        {classroom.source === "course" && <Badge variant="outline">{pick("دورة", "Course")}</Badge>}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold group-hover:text-primary">{classroom.classroomName}</h2>
                      {classroom.courseName && <p className="mt-2 flex items-start gap-2 break-words text-sm text-muted-foreground"><BookOpen className="mt-0.5 h-4 w-4 shrink-0" />{classroom.courseName}</p>}
                      {classroom.groupName && <p className="mt-2 flex items-start gap-2 break-words text-sm text-muted-foreground"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />{classroom.groupName}</p>}
                    </div>
                    {typeof classroom.studentsCount === "number" && <p className="mt-auto flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{pick(`${classroom.studentsCount} طالب`, `${classroom.studentsCount} students`)}</p>}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
