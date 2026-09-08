import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Loader2,
  MessageCircle,
  Play,
  Users,
  Video,
} from "lucide-react";
import { coursesApi, type CourseScheduleSlot } from "@/api/coursesApi";
import {
  classroomRecordingsApi,
  type ClassroomSession,
} from "@/api/classroomRecordingsApi";
import { ApiError } from "@/api/client";
import { courseError } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
const currentDay = (): CourseScheduleSlot["day"] =>
  (
    [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as CourseScheduleSlot["day"][]
  )[new Date().getDay()];
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const classroomIdOf = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String(
          (value as { id?: string; _id?: string }).id ||
            (value as { _id?: string })._id ||
            "",
        )
      : "";
const todaySlotPhase = (slot: CourseScheduleSlot) => {
  if (slot.day !== currentDay()) return "other" as const;
  const date = localDate();
  const start = new Date(`${date}T${slot.startTime}:00`);
  const end = slot.endTime
    ? new Date(`${date}T${slot.endTime}:00`)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const now = new Date();
  return now < start
    ? ("upcoming" as const)
    : now > end
      ? ("ended" as const)
      : ("ready" as const);
};
const sessionsFrom = (
  data:
    | ClassroomSession[]
    | { sessions?: ClassroomSession[]; data?: ClassroomSession[] },
) => (Array.isArray(data) ? data : data.sessions || data.data || []);
const hasEndedSession = (
  sessions: ClassroomSession[],
  slot: CourseScheduleSlot,
  groupId: string,
) => {
  const scheduled = new Date(`${localDate()}T${slot.startTime}:00`).getTime();
  return sessions.some((session) => {
    if (!["ended", "completed"].includes(session.status || "")) return false;
    const sessionGroupId = classroomIdOf(session.courseGroup);
    if (sessionGroupId && sessionGroupId !== groupId) return false;
    if (
      session.occurrenceKey?.includes(`:${localDate()}:`) &&
      session.occurrenceKey.endsWith(`:${slot.startTime}`)
    )
      return true;
    const sessionTime = session.scheduledStartAt || session.startAt;
    if (!sessionTime) return false;
    const started = new Date(sessionTime);
    return (
      localDate() === started.toLocaleDateString("en-CA") &&
      Math.abs(started.getTime() - scheduled) <= 2 * 60 * 60 * 1000
    );
  });
};

const startErrors: Record<string, string> = {
  COURSE_NOT_FOUND: "الدورة غير موجودة.",
  COURSE_GROUP_NOT_FOUND: "المجموعة غير موجودة.",
  COURSE_TEACHER_ACCESS_DENIED: "غير مصرح لك ببدء هذه الدورة.",
  COURSE_SCHEDULE_OCCURRENCE_NOT_FOUND:
    "هذا الموعد غير موجود في جدول المجموعة.",
  TOO_EARLY_TO_START: "لم يحن موعد بدء الحصة بعد.",
  START_WINDOW_CLOSED: "انتهت نافذة بدء هذه الحصة.",
  CLASSROOM_SESSION_ALREADY_ACTIVE: "توجد حصة نشطة بالفعل لهذه المجموعة.",
  ZOOM_MEETING_NOT_READY: "رابط Zoom الخاص بالمجموعة غير جاهز.",
};

export default function TeacherCourseDetail() {
  const { courseId = "" } = useParams();
  const client = useQueryClient();
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [chatClassroomId, setChatClassroomId] = useState("");
  const query = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: coursesApi.myTeachingCourses,
    refetchInterval: 10000,
  });
  const assignment = query.data?.find((item) => item.course.id === courseId);
  const groupClassroomIds = (assignment?.groups || []).map((group) =>
    classroomIdOf(group.classroom),
  );
  const sessionQueries = useQueries({
    queries: groupClassroomIds.map((classroomId) => ({
      queryKey: ["course-classroom-sessions", classroomId],
      queryFn: async () =>
        sessionsFrom(
          (await classroomRecordingsApi.listSessions(classroomId)).data,
        ),
      enabled: Boolean(classroomId),
      refetchInterval: 10000,
    })),
  });
  const start = async (
    groupId: string,
    classroomId: string,
    slot: CourseScheduleSlot,
  ) => {
    const key = `${groupId}-${slot.day}-${slot.startTime}`;
    setBusyKey(key);
    setError("");
    try {
      const session = await coursesApi.startCourseSession(classroomId, {
        courseId,
        groupId,
        occurrenceDate: localDate(),
        scheduledStartTime: slot.startTime,
      });
      const url = session.teacherStartUrl || session.meetingLink;
      if (!url) throw new Error("لم يرجع الخادم رابط Zoom صالحًا.");
      window.open(url, "_blank", "noopener,noreferrer");
      await client.invalidateQueries({ queryKey: ["teacher-courses"] });
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(startErrors[apiError.code] || courseError(caught));
    } finally {
      setBusyKey("");
    }
  };
  const join = async (classroomId: string) => {
    setBusyKey(`join-${classroomId}`);
    setError("");
    try {
      const session = await coursesApi.joinActiveSession(classroomId);
      if (!session.meetingLink)
        throw new Error("لم يرجع الخادم رابط Zoom صالحًا.");
      window.open(session.meetingLink, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(courseError(caught));
    } finally {
      setBusyKey("");
    }
  };

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
              <BreadcrumbLink asChild>
                <Link to="/portal/teacher/courses">دوراتي</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {assignment?.course.name || "تفاصيل الدورة"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="ghost" asChild>
          <Link to="/portal/teacher/courses">
            <ArrowRight className="me-2 h-4 w-4" />
            العودة إلى دوراتي
          </Link>
        </Button>
        {query.isLoading ? (
          <div className="grid min-h-64 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : query.error ? (
          <p className="text-destructive">{courseError(query.error)}</p>
        ) : !assignment ? (
          <p className="rounded-xl border p-10 text-center text-muted-foreground">
            الدورة غير موجودة ضمن دوراتك.
          </p>
        ) : (
          <>
            <header className="rounded-2xl border bg-card p-5">
              <h1 className="text-2xl font-bold">{assignment.course.name}</h1>
              <p className="mt-2 text-muted-foreground">
                {assignment.course.description}
              </p>
            </header>
            {error && (
              <p className="rounded-xl bg-destructive/10 p-3 text-destructive">
                {error}
              </p>
            )}
            <Tabs defaultValue="groups">
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="groups">
                  <Users className="me-2 h-4 w-4" />
                  المجموعات
                </TabsTrigger>
                <TabsTrigger value="chat">
                  <MessageCircle className="me-2 h-4 w-4" />
                  المحادثة
                </TabsTrigger>
              </TabsList>
              <TabsContent value="groups" className="mt-5 space-y-4">
                {assignment.groups.map((group, groupIndex) => {
                  const classroomId = classroomIdOf(group.classroom);
                  const active = group.activeSession;
                  return (
                    <Card key={group.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle>
                            <Link
                              className="text-primary underline-offset-4 hover:underline"
                              to={`/portal/teacher/courses/${courseId}/groups/${group.id}`}
                            >
                              {group.name}
                            </Link>
                          </CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge>{group.studentsCount || 0} طالب</Badge>
                            <Badge variant="secondary">{group.status}</Badge>
                            {classroomId && (
                              <Button size="sm" variant="outline" asChild>
                                <Link
                                  to={`/portal/teacher/courses/${courseId}/groups/${group.id}`}
                                >
                                  فتح المجموعة
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {active && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
                            <span className="font-semibold">
                              الحصة مباشرة الآن
                            </span>
                            <Button
                              disabled={
                                !active.canJoin ||
                                busyKey === `join-${classroomId}`
                              }
                              onClick={() => void join(classroomId)}
                            >
                              {busyKey === `join-${classroomId}` ? (
                                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="me-2 h-4 w-4" />
                              )}
                              دخول الحصة
                            </Button>
                          </div>
                        )}
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 font-semibold">
                            <CalendarDays className="h-4 w-4" />
                            جدول المجموعة
                          </h3>
                          {!group.schedule?.slots?.length ? (
                            <p className="text-sm text-muted-foreground">
                              لا توجد مواعيد محددة.
                            </p>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {group.schedule.slots.map((slot, index) => {
                                const key = `${group.id}-${slot.day}-${slot.startTime}`;
                                const phase = hasEndedSession(
                                  sessionQueries[groupIndex]?.data || [],
                                  slot,
                                  group.id,
                                )
                                  ? "ended"
                                  : todaySlotPhase(slot);
                                return (
                                  <div
                                    key={`${slot.day}-${slot.startTime}-${index}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                                  >
                                    <div>
                                      <p className="font-semibold">
                                        {dayNames[slot.day]}
                                      </p>
                                      <p
                                        dir="ltr"
                                        className="text-sm text-muted-foreground"
                                      >
                                        {slot.startTime}
                                        {slot.endTime
                                          ? ` - ${slot.endTime}`
                                          : ""}
                                      </p>
                                      {phase === "upcoming" && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          لم يحن الموعد بعد
                                        </p>
                                      )}
                                    </div>
                                    {phase === "ready" && !active && (
                                      <Button
                                        size="sm"
                                        disabled={
                                          !classroomId || Boolean(busyKey)
                                        }
                                        onClick={() =>
                                          void start(
                                            group.id,
                                            classroomId,
                                            slot,
                                          )
                                        }
                                      >
                                        {busyKey === key ? (
                                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Play className="me-2 h-4 w-4" />
                                        )}
                                        بدء الحصة
                                      </Button>
                                    )}
                                    {phase === "ended" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        asChild
                                      >
                                        <Link
                                          to={`/portal/teacher/course-recordings/${classroomId}`}
                                        >
                                          <Video className="me-2 h-4 w-4" />
                                          التسجيلات
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
              <TabsContent value="chat" className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {assignment.groups.map((group) => {
                    const id = classroomIdOf(group.classroom);
                    return id ? (
                      <Button
                        key={group.id}
                        variant={chatClassroomId === id ? "default" : "outline"}
                        onClick={() => setChatClassroomId(id)}
                      >
                        {group.name}
                      </Button>
                    ) : null;
                  })}
                </div>
                {chatClassroomId ? (
                  <CourseClassroomChat classroomId={chatClassroomId} />
                ) : (
                  <p className="rounded-xl border p-10 text-center text-muted-foreground">
                    اختر مجموعة لفتح المحادثة.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
