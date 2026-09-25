import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { BookOpen, CalendarDays, Clock3, Loader2, MessageCircle, Play, RefreshCw, Video } from "lucide-react";
import { coursesApi, type Course, type CourseGroup, type EnrollmentStatus } from "@/api/coursesApi";
import {
  classroomRecordingsApi,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import { courseError, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import RecordingPlayerModal, {
  type PlayerRecording,
} from "@/components/RecordingPlayerModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const recordingsFrom = (
  data:
    | SessionRecording[]
    | { recordings?: SessionRecording[]; data?: SessionRecording[] },
) => (Array.isArray(data) ? data : data.recordings || data.data || []);
const objectId = (value: unknown) =>
  typeof value === "object" && value
    ? String(
        (value as { id?: string; _id?: string }).id ||
          (value as { _id?: string })._id ||
          "",
      )
    : typeof value === "string"
      ? value
      : "";
const dayNames: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};
const statusLabels: Record<EnrollmentStatus, string> = {
  pending: "قيد الانتظار",
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
  refunded: "مسترد",
  expired: "منتهي",
  removed: "تمت إزالته",
};
const hours = (minutes: number) => Number((minutes / 60).toFixed(2));

export default function CourseEnrollmentDetail() {
  const { enrollmentId = "" } = useParams();
  const [selectedRecording, setSelectedRecording] =
    useState<PlayerRecording | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const enrollmentQuery = useQuery({
    queryKey: ["my-course-enrollment", enrollmentId],
    queryFn: () => coursesApi.myEnrollment(enrollmentId),
  });
  const progressQuery = useQuery({
    queryKey: ["my-course-progress", enrollmentId],
    queryFn: () => coursesApi.myProgress(enrollmentId),
    enabled: Boolean(enrollmentId),
  });
  const enrollment = enrollmentQuery.data;
  const group =
    typeof enrollment?.group === "object"
      ? (enrollment.group as CourseGroup)
      : null;
  const classroom =
    typeof enrollment?.classroom === "object"
      ? enrollment.classroom
      : typeof group?.classroom === "object"
        ? group.classroom
        : null;
  const classroomId =
    objectId(enrollment?.classroom) || objectId(group?.classroom);
  const recordingsQuery = useQuery({
    queryKey: ["course-enrollment-recordings", enrollmentId, classroomId],
    queryFn: async () =>
      recordingsFrom(
        (await classroomRecordingsApi.listRecordings(classroomId)).data,
      ),
    enabled: enrollment?.status === "active" && Boolean(classroomId),
  });
  const activeSessionQuery = useQuery({
    queryKey: ["course-active-session", classroomId],
    queryFn: () => coursesApi.activeSession(classroomId),
    enabled: enrollment?.status === "active" && Boolean(classroomId),
    refetchInterval: 10000,
  });
  const scheduleQuery = useQuery({
    queryKey: ["student-course-schedule", classroomId],
    queryFn: () => coursesApi.getSchedule(classroomId),
    enabled: enrollment?.status === "active" && Boolean(classroomId),
  });
  const closeRecording = useCallback(() => setSelectedRecording(null), []);
  const course =
    typeof enrollment?.course === "object"
      ? (enrollment.course as Course)
      : null;
  const progress = progressQuery.data;
  const recordings = useMemo(
    () => recordingsQuery.data || [],
    [recordingsQuery.data],
  );
  const joinActiveSession = async () => {
    if (!classroomId || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const session = await coursesApi.joinActiveSession(classroomId);
      if (!session.meetingLink)
        throw new Error("لم يرجع الخادم رابط دخول صالحًا.");
      window.open(session.meetingLink, "_blank", "noopener,noreferrer");
    } catch (error) {
      setJoinError(courseError(error));
    } finally {
      setJoining(false);
    }
  };
  const showSchedule = () => {
    setActiveTab("details");
    window.setTimeout(() => {
      document
        .getElementById("course-schedule")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  if (enrollmentQuery.isLoading)
    return (
      <DashboardLayout>
        <p>جاري التحميل...</p>
      </DashboardLayout>
    );
  if (enrollmentQuery.error || !enrollment)
    return (
      <DashboardLayout>
        <p className="text-destructive">{courseError(enrollmentQuery.error)}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">تفاصيل الاشتراك في الدورة</p>
                <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">{course?.name || refName(enrollment.course)}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{enrollment.mode === "group" ? "جماعي" : "فردي"}</Badge>
                  <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>{statusLabels[enrollment.status]}</Badge>
                </div>
              </div>
              {enrollment.status === "active" && classroomId && <Button variant="outline" onClick={showSchedule}><CalendarDays className="me-2 h-4 w-4" />جدول الدورة الأسبوعي</Button>}
            </div>
            <dl className="mt-5 grid gap-3 border-t pt-5 text-sm sm:grid-cols-2">
              {(classroom?.name || group?.name) && <div><dt className="text-muted-foreground">الفصل / المجموعة</dt><dd className="mt-1 break-words font-semibold">{classroom?.name || group?.name}</dd></div>}
              {typeof enrollment.price === "number" && <div><dt className="text-muted-foreground">قيمة الاشتراك</dt><dd className="mt-1 font-semibold">{enrollment.price} {enrollment.currency}</dd></div>}
            </dl>
          </CardContent>
        </Card>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          dir="rtl"
          className="space-y-5"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl p-1.5">
            <TabsTrigger value="details" className="gap-2 py-2.5">
              <BookOpen className="h-4 w-4" />
              تفاصيل الدورة
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="gap-2 py-2.5"
              disabled={enrollment.status !== "active" || !classroomId}
            >
              <MessageCircle className="h-4 w-4" />
              محادثة الدورة
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل التسجيل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course?.description ? <p className="whitespace-pre-wrap break-words leading-7">{course.description}</p> : <p className="text-muted-foreground">لا يوجد وصف متاح للدورة.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>التقدم</CardTitle>
                </CardHeader>
                <CardContent>
                  {progressQuery.isLoading ? (
                    <p>جاري تحميل التقدم...</p>
                  ) : progressQuery.error ? (
                    <div className="space-y-3"><p className="text-sm text-destructive">{courseError(progressQuery.error)}</p><Button size="sm" variant="outline" onClick={() => void progressQuery.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div>
                  ) : progress ? (
                    <div className="space-y-4">
                      <div className="flex items-end justify-between gap-3"><b className="text-2xl">{progress.percentage}%</b><Badge variant="outline">{statusLabels[progress.status as EnrollmentStatus] || progress.status}</Badge></div>
                      <Progress value={progress.percentage} />
                      <dl className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-muted p-3"><dt className="text-muted-foreground">الساعات المنجزة</dt><dd className="mt-1 font-bold">{hours(progress.completedMinutes ?? 0)} ساعة</dd></div><div className="rounded-xl bg-muted p-3"><dt className="text-muted-foreground">الساعات المطلوبة</dt><dd className="mt-1 font-bold">{hours(progress.requiredMinutes ?? 0)} ساعة</dd></div></dl>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      لا توجد بيانات تقدم بعد.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            {enrollment.status === "active" && classroomId && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />الجلسة المباشرة للدورة</CardTitle></CardHeader>
                <CardContent>
                  {activeSessionQuery.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />جاري التحقق من الجلسة...</div>
                    : activeSessionQuery.error ? <div className="space-y-3"><p className="text-sm text-destructive">{courseError(activeSessionQuery.error)}</p><Button size="sm" variant="outline" onClick={() => void activeSessionQuery.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div>
                    : activeSessionQuery.data ? <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant={activeSessionQuery.data.canJoin ? "default" : "outline"}>{activeSessionQuery.data.status}</Badge>{activeSessionQuery.data.canJoin && <Badge className="bg-emerald-600">مباشرة الآن</Badge>}</div>{activeSessionQuery.data.title && <p className="break-words font-semibold">{activeSessionQuery.data.title}</p>}{activeSessionQuery.data.teacher?.fullName && <p className="text-sm text-muted-foreground">المعلم: {activeSessionQuery.data.teacher.fullName}</p>}{activeSessionQuery.data.startAt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />{new Date(activeSessionQuery.data.startAt).toLocaleString("ar-EG")}</p>}</div>{activeSessionQuery.data.canJoin && <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={joining} onClick={() => void joinActiveSession()}>{joining ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Video className="me-2 h-4 w-4" />}دخول الحصة الآن</Button>}</div>
                      : <p className="text-muted-foreground">لا توجد جلسة مباشرة الآن.</p>}
                  {joinError && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{joinError}</p>}
                </CardContent>
              </Card>
            )}
            {enrollment.status === "active" && classroomId && (
              <Card id="course-schedule" className="scroll-mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    جدول الدورة الأسبوعي
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">مواعيد أسبوعية متكررة وليست جلسات بتاريخ محدد.</p>
                </CardHeader>
                <CardContent>
                  {scheduleQuery.isLoading ? (
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  ) : scheduleQuery.error ? (
                    <div className="space-y-3"><p className="text-destructive">{courseError(scheduleQuery.error)}</p><Button size="sm" variant="outline" onClick={() => void scheduleQuery.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div>
                  ) : !scheduleQuery.data?.slots.length ? (
                    <p className="text-muted-foreground">
                      لم يحدد الأدمن مواعيد الدورة بعد.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {scheduleQuery.data.slots.map((slot, index) => (
                        <div
                          key={`${slot.day}-${slot.startTime}-${index}`}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <p className="font-bold">
                            {dayNames[slot.day] || slot.day}
                          </p>
                          <p className="mt-1" dir="ltr">
                            {slot.startTime}
                            {slot.endTime ? ` - ${slot.endTime}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>التسجيلات</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollment.status !== "active" ? (
                  <p className="text-muted-foreground">
                    تتاح التسجيلات بعد تفعيل التسجيل.
                  </p>
                ) : !classroomId ? (
                  <p className="text-muted-foreground">لم يتم تعيين فصل بعد.</p>
                ) : recordingsQuery.isLoading ? (
                  <p>جاري تحميل التسجيلات...</p>
                ) : recordingsQuery.error ? (
                  <div className="space-y-3"><p className="text-destructive">{courseError(recordingsQuery.error)}</p><Button size="sm" variant="outline" onClick={() => void recordingsQuery.refetch()}><RefreshCw className="me-2 h-4 w-4" />إعادة المحاولة</Button></div>
                ) : !recordings.length ? (
                  <p className="text-muted-foreground">
                    لا توجد تسجيلات حتى الآن.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {recordings.map((recording, index) => {
                      const url =
                        recording.localUrl ||
                        recording.recordingLink ||
                        recording.shareUrl;
                      return (
                        <Button
                          key={`${url || recording.sessionName}-${index}`}
                          variant="outline"
                          className="h-auto justify-start p-4"
                          disabled={!url}
                          onClick={() =>
                            url &&
                            (recording.shareUrl && !recording.localUrl
                              ? window.open(
                                  recording.shareUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              : setSelectedRecording({
                                  sessionName: recording.sessionName,
                                  recordingLink: url,
                                }))
                          }
                        >
                          <Play className="me-2 h-4 w-4" />
                          {recording.sessionName || "تسجيل حصة"}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chat" className="mt-0">
            {enrollment.status === "active" && classroomId && (
              <CourseClassroomChat classroomId={classroomId} />
            )}
          </TabsContent>
        </Tabs>
        <RecordingPlayerModal
          recording={selectedRecording}
          onClose={closeRecording}
        />
      </div>
    </DashboardLayout>
  );
}
