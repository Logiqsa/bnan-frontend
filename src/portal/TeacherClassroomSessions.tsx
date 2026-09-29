import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  LogOut,
  MessageCircle,
  RefreshCw,
  School,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  classroomRecordingsApi,
  type ClassroomSession,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import {
  teacherClassroomAssignmentsApi,
  type TeacherClassroomAssignment,
} from "@/api/teacherClassroomAssignmentsApi";
import {
  teacherClassroomChangeRequestsApi,
  type TeacherClassroomLeaveRequest,
} from "@/api/teacherClassroomChangeRequestsApi";
import { courseError } from "@/lib/courseUi";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import ClassroomSessionActions from "@/components/ClassroomSessionActions";
import AssignmentAttachmentPreview from "@/components/AssignmentAttachmentPreview";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import ClassroomScheduleManagement from "@/admin/zoom/ClassroomScheduleManagement";
import ClassroomEvaluations from "@/portal/ClassroomEvaluations";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";

const sessionsFrom = (
  data:
    | ClassroomSession[]
    | { sessions?: ClassroomSession[]; data?: ClassroomSession[] },
) => (Array.isArray(data) ? data : data.sessions || data.data || []);

const recordingsFrom = (
  data:
    | SessionRecording[]
    | { recordings?: SessionRecording[]; data?: SessionRecording[] },
) => (Array.isArray(data) ? data : data.recordings || data.data || []);

const nameOf = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? (value as { name?: string; fullName?: string }).name ||
        (value as { fullName?: string }).fullName ||
        ""
      : "";

const leaveRequestStatus = {
  pending: "الطلب قيد المراجعة",
  approved: "تمت الموافقة على الطلب",
  rejected: "تم رفض الطلب",
  cancelled: "تم إلغاء الطلب",
} as const;

const requestClassroomSubjectId = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? (value as { id?: string; _id?: string }).id ||
        (value as { _id?: string })._id ||
        ""
      : "";

const ErrorCard = ({
  message,
  retry,
  retrying,
}: {
  message: string;
  retry: () => void;
  retrying: boolean;
}) => (
  <Card>
    <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-destructive">{message}</p>
      <Button variant="outline" onClick={retry} disabled={retrying}>
        <RefreshCw className={`me-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
        إعادة المحاولة
      </Button>
    </CardContent>
  </Card>
);

export default function TeacherClassroomSessions() {
  const { classroomId = "" } = useParams<{ classroomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ classroomSubjectId: string; subjectName: string } | null>(null);
  const [leaveNotes, setLeaveNotes] = useState("");
  const [submittedLeaveRequests, setSubmittedLeaveRequests] = useState<
    Record<string, TeacherClassroomLeaveRequest>
  >({});
  const [assignmentForm, setAssignmentForm] = useState({ subjectId: "", title: "", description: "", dueDate: "", totalPoints: "10", attachment: null as File | null });
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const subjects = useQuery({
    queryKey: ["teacher-classroom-subjects", classroomId],
    queryFn: async () =>
      (await classroomRecordingsApi.listSubjects(classroomId)).data,
    enabled: Boolean(classroomId),
    retry: 1,
  });
  const sessions = useQuery({
    queryKey: ["teacher-classroom-sessions", classroomId],
    queryFn: async () =>
      sessionsFrom((await classroomRecordingsApi.listSessions(classroomId)).data),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    retry: 1,
  });
  const recordings = useQuery({
    queryKey: ["teacher-classroom-recordings", classroomId],
    queryFn: async () =>
      recordingsFrom((await classroomRecordingsApi.listRecordings(classroomId)).data),
    enabled: Boolean(classroomId),
    retry: 1,
  });
  const assignments = useQuery({
    queryKey: ["teacher-classroom-assignments", classroomId],
    queryFn: async () =>
      (await teacherClassroomAssignmentsApi.list(classroomId)).data,
    enabled: Boolean(classroomId),
    retry: 1,
  });
  const students = useQuery({
    queryKey: ["teacher-classroom-students", classroomId],
    queryFn: async () =>
      (await classroomRecordingsApi.listStudents(classroomId)).data,
    enabled: Boolean(classroomId),
    retry: 1,
  });
  const leaveRequests = useQuery({
    queryKey: ["teacher-classroom-leave-requests", classroomId],
    queryFn: () => teacherClassroomChangeRequestsApi.listLeaveRequests(classroomId),
    enabled: Boolean(classroomId),
    retry: 1,
  });

  const classroomSubjects = useMemo(
    () => subjects.data?.subjects || [],
    [subjects.data?.subjects],
  );
  const classroomName = subjects.data?.classroom?.name || "";
  const leaveRequestsBySubject = useMemo(
    () =>
      new Map(
        (leaveRequests.data || [])
          .filter((request) => request.requestType === "teacher_leave")
          .map((request) => [requestClassroomSubjectId(request.classroomSubject), request]),
      ),
    [leaveRequests.data],
  );
  const teachers = useMemo(
    () => [
      ...new Set(
        classroomSubjects
          .map((item) => item.teacher?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    [classroomSubjects],
  );
  const upcomingCount = (sessions.data || []).filter((session) => {
    const start = session.scheduledStartAt || session.startAt;
    return Boolean(start && new Date(start).getTime() >= Date.now());
  }).length;
  const completedSessions = (sessions.data || [])
    .filter((session) => {
      const status = String(session.status || "").toLowerCase();
      return ["ended", "completed", "awaiting_zoom_end"].includes(status)
        || Boolean(session.actualEndedAt || session.endAt);
    })
    .sort((a, b) => new Date(b.actualEndedAt || b.endAt || b.scheduledStartAt || b.startAt || 0).getTime() - new Date(a.actualEndedAt || a.endAt || a.scheduledStartAt || a.startAt || 0).getTime());
  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(date);
  };
  const assignmentSubject = (assignment: TeacherClassroomAssignment) =>
    nameOf(assignment.subject) || nameOf(assignment.classroomSubject?.subject);
  const createAssignment = useMutation({
    mutationFn: () => teacherClassroomAssignmentsApi.create({
      classroomId,
      subjectId: assignmentForm.subjectId,
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
      dueDate: assignmentForm.dueDate,
      totalPoints: Number(assignmentForm.totalPoints),
      attachment: assignmentForm.attachment,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher-classroom-assignments", classroomId] });
      setCreateOpen(false);
      setAssignmentForm({ subjectId: "", title: "", description: "", dueDate: "", totalPoints: "10", attachment: null });
      toast.success("تم إنشاء الواجب وإرسال إشعار للطلاب");
    },
    onError: (error: Error) => toast.error(error.message || "تعذر إنشاء الواجب"),
  });
  const createLeaveRequest = useMutation({
    mutationFn: () => {
      if (!leaveTarget) throw new Error("اختر المادة أولًا.");
      return teacherClassroomChangeRequestsApi.createLeaveRequest({
        classroomId,
        classroomSubjectId: leaveTarget.classroomSubjectId,
        notes: leaveNotes.trim(),
      });
    },
    onSuccess: (request) => {
      if (leaveTarget) {
        setSubmittedLeaveRequests((current) => ({
          ...current,
          [leaveTarget.classroomSubjectId]: request,
        }));
      }
      queryClient.setQueryData(
        ["teacher-classroom-leave-requests", classroomId],
        (current: typeof leaveRequests.data) => [request, ...(current || [])],
      );
      setLeaveTarget(null);
      setLeaveNotes("");
      toast.success("تم إرسال طلب عدم الاستمرار إلى الإدارة.");
    },
    onError: (error: Error) => toast.error(error.message || "تعذر إرسال الطلب."),
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6" dir="rtl">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <School className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  {classroomName || "تفاصيل الفصل"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">تفاصيل الفصل</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subjects.data?.curriculum?.name && (
                    <Badge variant="secondary">
                      <BookOpen className="me-1 h-3.5 w-3.5" />
                      {subjects.data.curriculum.name}
                    </Badge>
                  )}
                  {subjects.data?.grade?.name && (
                    <Badge variant="outline">{subjects.data.grade.name}</Badge>
                  )}
                  {classroomSubjects.map((item) => (
                    <Badge key={item.classroomSubjectId} variant="outline">
                      {item.name}
                    </Badge>
                  ))}
                  {teachers.length > 0 && (
                    <Badge variant="secondary">
                      المعلم: {teachers.join("، ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ClassroomSessionActions classroomId={classroomId} />
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/portal/teacher/classrooms">
                  <ArrowRight className="me-2 h-4 w-4" />
                  العودة للفصول
                </Link>
              </Button>
            </div>
          </div>
          {subjects.isError && (
            <p className="mt-4 text-sm text-destructive">
              {courseError(subjects.error)}
            </p>
          )}
        </header>

        <Tabs defaultValue={searchParams.get("tab") === "recordings" ? "recordings" : "overview"}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-7">
            <TabsTrigger value="chat">
              <MessageCircle className="me-1 h-4 w-4" />
              المحادثة
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <FileText className="me-1 h-4 w-4" />
              الواجبات
            </TabsTrigger>
            <TabsTrigger value="recordings">
              <Video className="me-1 h-4 w-4" />
              التسجيلات
            </TabsTrigger>
            <TabsTrigger value="completed-sessions">
              <Clock3 className="me-1 h-4 w-4" />
              الحصص المنتهية
            </TabsTrigger>
            <TabsTrigger value="evaluations">
              <ClipboardCheck className="me-1 h-4 w-4" />
              التقييمات
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <CalendarDays className="me-1 h-4 w-4" />
              الجدول
            </TabsTrigger>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="الجلسات القادمة"
                value={sessions.isPending ? "…" : String(upcomingCount)}
                icon={<CalendarDays className="h-5 w-5" />}
              />
              <SummaryCard
                label="التسجيلات"
                value={recordings.isPending ? "…" : String(recordings.data?.length || 0)}
                icon={<Video className="h-5 w-5" />}
              />
              <SummaryCard
                label="الواجبات"
                value={assignments.isPending ? "…" : String(assignments.data?.length || 0)}
                icon={<FileText className="h-5 w-5" />}
              />
              <Card>
                <CardContent className="flex h-full items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">محادثة الفصل</p>
                    <p className="mt-1 font-semibold">متاحة من تبويب المحادثة</p>
                  </div>
                  <MessageCircle className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-xl font-bold">
                      <BookOpen className="h-5 w-5 text-primary" />
                      المواد والمعلمون
                    </h2>
                    <Badge variant="outline">{classroomSubjects.length}</Badge>
                  </div>
                  {subjects.isPending ? (
                    <Skeleton className="h-12 w-full rounded-lg" />
                  ) : !classroomSubjects.length ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد مواد مرتبطة بهذا الفصل.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {classroomSubjects.map((item) => (
                        <div
                          key={item.classroomSubjectId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.teacher?.name || "غير محدد"}
                          </span>
                          {leaveRequests.isPending ? (
                            <Badge variant="outline">جاري تحميل حالة الطلب...</Badge>
                          ) : submittedLeaveRequests[item.classroomSubjectId] ||
                            leaveRequestsBySubject.get(item.classroomSubjectId) ? (
                            <Badge
                              variant={
                                (submittedLeaveRequests[item.classroomSubjectId] ||
                                  leaveRequestsBySubject.get(item.classroomSubjectId))
                                  ?.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="gap-1"
                            >
                              <Clock3 className="h-3.5 w-3.5" />
                              {leaveRequestStatus[
                                (submittedLeaveRequests[item.classroomSubjectId] ||
                                  leaveRequestsBySubject.get(item.classroomSubjectId))
                                  ?.status || "pending"
                              ]}
                            </Badge>
                          ) : item.canRequestLeave && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setLeaveNotes("");
                                setLeaveTarget({
                                  classroomSubjectId: item.classroomSubjectId,
                                  subjectName: item.name,
                                });
                              }}
                            >
                              <LogOut className="me-1 h-4 w-4" />
                              طلب عدم الاستمرار
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-xl font-bold">
                      <Users className="h-5 w-5 text-primary" />
                      الطلاب
                    </h2>
                    <Badge variant="outline">
                      {students.isPending ? "…" : students.data?.length || 0}
                    </Badge>
                  </div>
                  {students.isPending ? (
                    <Skeleton className="h-12 w-full rounded-lg" />
                  ) : students.isError ? (
                    <p className="text-sm text-destructive">
                      تعذر تحميل طلاب الفصل.
                    </p>
                  ) : !students.data?.length ? (
                    <p className="text-sm text-muted-foreground">
                      لا يوجد طلاب مرتبطون بهذا الفصل.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {students.data.map((student) => (
                        <div
                          key={student.studentId}
                          className="rounded-xl border p-3 text-sm"
                        >
                          {student.fullName}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-5">
            <ClassroomScheduleManagement classroomId={classroomId} embedded />
          </TabsContent>

          <TabsContent value="recordings" className="mt-5">
            {recordings.isPending ? (
              <LoadingGrid label="جاري تحميل التسجيلات" />
            ) : recordings.isError ? (
              <ErrorCard
                message="تعذر تحميل تسجيلات الفصل."
                retry={() => void recordings.refetch()}
                retrying={recordings.isFetching}
              />
            ) : !recordings.data?.length ? (
              <EmptyState text="لا توجد تسجيلات متاحة حاليًا." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recordings.data.map((recording, index) => (
                  <Card key={recording.sessionId || `${recording.sessionName}-${index}`}>
                    <CardContent className="space-y-3 p-5">
                      <h2 className="font-bold">{recording.sessionName || "تسجيل جلسة"}</h2>
                      {recording.scheduledStartAt && <p className="text-sm text-muted-foreground">{formatDate(recording.scheduledStartAt)}</p>}
                      {recording.recordingLink && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedRecording({
                            sessionName: recording.sessionName || "تسجيل جلسة",
                            recordingLink: recording.recordingLink,
                          })}
                        >
                          <Video className="me-2 h-4 w-4" />
                          مشاهدة التسجيل
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed-sessions" className="mt-5">
            {sessions.isPending ? (
              <LoadingGrid label="جاري تحميل الحصص المنتهية" />
            ) : sessions.isError ? (
              <ErrorCard message="تعذر تحميل حصص الفصل." retry={() => void sessions.refetch()} retrying={sessions.isFetching} />
            ) : !completedSessions.length ? (
              <EmptyState text="لا توجد حصص منتهية لهذا الفصل حاليًا." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedSessions.map((session, index) => {
                  const sessionId = session.id || session._id;
                  const endedAt = session.actualEndedAt || session.endAt || session.scheduledStartAt || session.startAt;
                  return sessionId ? (
                    <Card key={sessionId} className="transition hover:-translate-y-0.5 hover:shadow-md">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-bold">{session.title || session.sessionName || `حصة ${completedSessions.length - index}`}</h2>
                          <Badge variant="secondary">منتهية</Badge>
                        </div>
                        {endedAt && <p className="text-sm text-muted-foreground">{formatDate(endedAt)}</p>}
                        <Button asChild size="sm">
                          <Link to={`/portal/teacher/classrooms/${encodeURIComponent(classroomId)}/sessions/${encodeURIComponent(sessionId)}`}>
                            عرض الحضور والتفاصيل
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null;
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="evaluations" className="mt-5">
            <ClassroomEvaluations classroomId={classroomId} embedded />
          </TabsContent>

          <TabsContent value="assignments" className="mt-5">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setCreateOpen(true)}>
                <FileText className="me-2 h-4 w-4" />
                إنشاء واجب
              </Button>
            </div>
            {assignments.isPending ? (
              <LoadingGrid label="جاري تحميل الواجبات" />
            ) : assignments.isError ? (
              <ErrorCard
                message="تعذر تحميل واجبات الفصل."
                retry={() => void assignments.refetch()}
                retrying={assignments.isFetching}
              />
            ) : !assignments.data?.length ? (
              <EmptyState text="لا توجد واجبات لهذا الفصل حاليًا." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {assignments.data.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className="transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-bold text-primary">{assignment.title}</h2>
                        {assignment.status && <Badge variant="secondary">{assignment.status}</Badge>}
                      </div>
                      {assignmentSubject(assignment) && <p className="text-sm text-muted-foreground">المادة: {assignmentSubject(assignment)}</p>}
                      <p className="text-sm text-muted-foreground">تاريخ التسليم: {formatDate(assignment.dueDate)}</p>
                      {assignment.description && <p className="whitespace-pre-wrap text-sm">{assignment.description}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/portal/teacher/assignments/${encodeURIComponent(assignment.id)}`)}>عرض التسليمات</Button>
                        {assignment.attachment && <AssignmentAttachmentPreview url={assignment.attachment} label="معاينة المرفق" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-5">
            <CourseClassroomChat classroomId={classroomId} />
          </TabsContent>
        </Tabs>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء واجب</DialogTitle>
              <DialogDescription>سيتم إرسال إشعار للطلاب بعد إنشاء الواجب بنجاح.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!assignmentForm.subjectId || !assignmentForm.title.trim() || !assignmentForm.dueDate || Number(assignmentForm.totalPoints) <= 0) return; createAssignment.mutate(); }}>
              <label className="block space-y-2 text-sm font-medium">المادة
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2" value={assignmentForm.subjectId} onChange={(event) => setAssignmentForm((current) => ({ ...current, subjectId: event.target.value }))} required>
                  <option value="">اختر المادة</option>
                  {classroomSubjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>{subject.name}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">اسم الواجب<Input value={assignmentForm.title} onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} required /></label>
              <label className="block space-y-2 text-sm font-medium">الوصف<Textarea value={assignmentForm.description} onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">موعد التسليم<Input type="datetime-local" value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))} required /></label>
              <label className="block space-y-2 text-sm font-medium">الدرجة الكاملة<Input type="number" min="0.01" step="any" value={assignmentForm.totalPoints} onChange={(event) => setAssignmentForm((current) => ({ ...current, totalPoints: event.target.value }))} required /></label>
              </div>
              <label className="block space-y-2 text-sm font-medium">مرفق اختياري<Input type="file" onChange={(event) => setAssignmentForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} /></label>
              <DialogFooter><Button type="submit" disabled={createAssignment.isPending}>{createAssignment.isPending ? "جاري الإنشاء..." : "إنشاء الواجب"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(leaveTarget)}
          onOpenChange={(open) => {
            if (!open && !createLeaveRequest.isPending) {
              setLeaveTarget(null);
              setLeaveNotes("");
            }
          }}
        >
          <DialogContent
            dir="rtl"
            className="w-[calc(100%-1.5rem)] max-w-xl max-h-[calc(100dvh-1.5rem)] p-4 sm:p-6"
          >
            <DialogHeader className="space-y-1 pe-8 text-start">
              <DialogTitle>طلب عدم الاستمرار في الفصل</DialogTitle>
              <DialogDescription>
                {leaveTarget
                  ? `سيُرسل طلب استبدال لك في مادة ${leaveTarget.subjectName} إلى الإدارة.`
                  : "سيتم إرسال الطلب إلى الإدارة."}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (leaveNotes.trim().length < 5) return;
                createLeaveRequest.mutate();
              }}
            >
              <label className="block space-y-2 text-sm font-medium" htmlFor="teacher-leave-notes">
                سبب طلب عدم الاستمرار
                <Textarea
                  id="teacher-leave-notes"
                  value={leaveNotes}
                  onChange={(event) => setLeaveNotes(event.target.value)}
                  minLength={5}
                  maxLength={2000}
                  required
                  placeholder="اكتب سبب الطلب"
                  className="min-h-28 resize-y"
                />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">
                لن يتغير تعيينك قبل مراجعة الإدارة واختيار معلم بديل.
              </p>
              <DialogFooter className="gap-2 sm:justify-end sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setLeaveTarget(null)}
                  disabled={createLeaveRequest.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={createLeaveRequest.isPending || leaveNotes.trim().length < 5}
                >
                  {createLeaveRequest.isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <RecordingPlayerModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
        <span className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</span>
      </CardContent>
    </Card>
  );
}

function LoadingGrid({ label }: { label: string }) {
  return <div className="grid gap-4 md:grid-cols-2" aria-label={label}>{[1, 2].map((item) => <Skeleton key={item} className="h-40 rounded-xl" />)}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <Card><CardContent className="flex min-h-40 items-center justify-center p-6 text-center text-muted-foreground">{text}</CardContent></Card>;
}
