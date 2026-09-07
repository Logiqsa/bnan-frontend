import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Video,
} from "lucide-react";
import { coursesApi } from "@/api/coursesApi";
import {
  classroomRecordingsApi,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import { courseError } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const dayNames: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};
const idOf = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String(
          (value as { id?: string; _id?: string }).id ||
            (value as { _id?: string })._id ||
            "",
        )
      : "";
const recordingsFrom = (
  data:
    | SessionRecording[]
    | { recordings?: SessionRecording[]; data?: SessionRecording[] },
) => (Array.isArray(data) ? data : data.recordings || data.data || []);

export default function TeacherCourseGroupDetail() {
  const { courseId = "", groupId = "" } = useParams();
  const courses = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: coursesApi.myTeachingCourses,
  });
  const assignment = courses.data?.find((item) => item.course.id === courseId);
  const group = assignment?.groups.find((item) => item.id === groupId);
  const classroomId = idOf(group?.classroom);
  const recordings = useQuery({
    queryKey: ["teacher-course-group-recordings", classroomId],
    queryFn: async () =>
      recordingsFrom(
        (await classroomRecordingsApi.listRecordings(classroomId)).data,
      ),
    enabled: Boolean(classroomId),
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/schedule">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/courses">دوراتي</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/portal/teacher/courses/${courseId}`}>
                  {assignment?.course.name || "الدورة"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>{group?.name || "المجموعة"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="ghost" asChild>
          <Link to={`/portal/teacher/courses/${courseId}`}>
            <ArrowRight className="me-2 h-4 w-4" />
            العودة إلى الدورة
          </Link>
        </Button>
        {courses.isLoading ? (
          <div className="grid min-h-64 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : courses.error ? (
          <p className="rounded-xl border p-8 text-center text-destructive">
            {courseError(courses.error)}
          </p>
        ) : !assignment || !group ? (
          <p className="rounded-xl border p-10 text-center text-muted-foreground">
            المجموعة غير موجودة ضمن دوراتك.
          </p>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  {assignment.course.name}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{group.name}</h1>
              </div>
              <div className="flex gap-2">
                <Badge>{group.studentsCount || 0} طالب</Badge>
                <Badge variant="secondary">{group.status}</Badge>
              </div>
            </header>
            <Tabs defaultValue="schedule">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="schedule">
                  <CalendarDays className="me-2 h-4 w-4" />
                  الجدول
                </TabsTrigger>
                <TabsTrigger value="chat">
                  <MessageCircle className="me-2 h-4 w-4" />
                  المحادثة
                </TabsTrigger>
                <TabsTrigger value="recordings">
                  <Video className="me-2 h-4 w-4" />
                  التسجيلات
                </TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-5 space-y-4">
                <div className="flex justify-end">
                  <Button asChild disabled={!classroomId}>
                    <Link
                      to={`/portal/teacher/course-classrooms/${classroomId}/schedule`}
                    >
                      <Pencil className="me-2 h-4 w-4" />
                      تعديل جدول المجموعة
                    </Link>
                  </Button>
                </div>
                {!group.schedule?.slots?.length ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      لم يتم تحديد مواعيد للمجموعة بعد.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.schedule.slots.map((slot, index) => (
                      <div
                        key={`${slot.day}-${slot.startTime}-${index}`}
                        className="rounded-xl border bg-card p-4"
                      >
                        <p className="font-bold">
                          {dayNames[slot.day] || slot.day}
                        </p>
                        <p className="mt-2 text-muted-foreground" dir="ltr">
                          {slot.startTime}
                          {slot.endTime ? ` - ${slot.endTime}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="chat" className="mt-5">
                {classroomId ? (
                  <CourseClassroomChat classroomId={classroomId} />
                ) : (
                  <p className="rounded-xl border p-10 text-center text-muted-foreground">
                    لا يوجد فصل مرتبط بالمجموعة.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="recordings" className="mt-5">
                {recordings.isLoading ? (
                  <div className="grid min-h-40 place-items-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : recordings.error ? (
                  <div className="py-10 text-center text-destructive">
                    <p>{courseError(recordings.error)}</p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      onClick={() => void recordings.refetch()}
                    >
                      إعادة المحاولة
                    </Button>
                  </div>
                ) : !recordings.data?.length ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      لا توجد تسجيلات لهذه المجموعة حتى الآن.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {recordings.data.map((recording, index) => {
                      const url =
                        recording.localUrl ||
                        recording.recordingLink ||
                        recording.shareUrl;
                      return (
                        <Button
                          key={recording.sessionId || index}
                          variant="outline"
                          className="h-auto justify-between p-4"
                          disabled={!url}
                          onClick={() =>
                            url &&
                            window.open(url, "_blank", "noopener,noreferrer")
                          }
                        >
                          <span>{recording.sessionName || "تسجيل حصة"}</span>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
