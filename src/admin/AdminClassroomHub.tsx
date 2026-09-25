import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Eye, MessageSquare, Play, RefreshCw, School, Users, Video } from "lucide-react";
import { ApiError } from "@/api/client";
import { adminEvaluationsApi, type AdminEvaluation } from "@/api/adminEvaluationsApi";
import { adminAssignmentsApi } from "@/api/adminAssignmentsApi";
import { adminClassroomAttendanceApi, type AdminAttendanceStatus } from "@/api/adminClassroomAttendanceApi";
import { classroomRecordingsApi, type ClassroomSession } from "@/api/classroomRecordingsApi";
import { classroomZoomApi } from "@/api/classroomZoomApi";
import { Badge } from "@/components/ui/badge";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";
import { normalizeZoomState, referenceName, zoomDisplayState } from "@/admin/zoom/classroomZoomNormalization";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import AdminClassroomChat from "@/admin/AdminClassroomChat";
import ClassroomScheduleManagement from "@/admin/zoom/ClassroomScheduleManagement";
import ClassroomZoomManagement from "@/admin/zoom/ClassroomZoomManagement";

const tabs = [
  ["overview", "نظرة عامة"], ["sessions", "الحصص"], ["recordings", "التسجيلات"],
  ["evaluations", "التقييمات"], ["attendance", "الحضور والغياب"], ["assignments", "الواجبات"],
  ["chat", "المحادثات"], ["schedule", "الجدول"], ["zoom", "Zoom"],
] as const;

const errorText = (error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) return "ليس لديك صلاحية لعرض هذا الفصل.";
  if (status === 404) return "الفصل غير موجود أو لم يعد متاحًا.";
  return "تعذر تحميل بيانات الفصل. تحقق من الاتصال وحاول مرة أخرى.";
};

const display = (value?: string | null) => value || "—";
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("ar-EG-u-ca-gregory") : "—";
const sessionId = (session: ClassroomSession) => session.id || session._id || `${session.startAt || "session"}-${session.occurrenceKey || ""}`;
const sessionTitle = (session: ClassroomSession) => session.title || session.sessionName || "حصة";
const sessionSubject = (session: ClassroomSession) => typeof session.subject === "string" ? "" : session.subject?.name || (typeof session.classroomSubject === "object" ? session.classroomSubject?.subject?.name || session.classroomSubject?.name : "") || "";
const sessionTeacher = (session: ClassroomSession) => typeof session.teacher === "string" ? "" : session.teacher?.name || session.teacher?.fullName || "";
const statusLabel: Record<string, string> = { live: "مباشرة", starting: "جاري البدء", completed: "مكتملة", ended: "منتهية", cancelled: "ملغاة", scheduled: "مجدولة", awaiting_zoom_end: "بانتظار انتهاء Zoom" };

function QueryState({ loading, error, retry }: { loading: boolean; error?: unknown; retry: () => void }) {
  if (loading) return <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>;
  if (error) return <div role="alert" className="grid gap-3 py-8 text-center"><p>{errorText(error)}</p><Button variant="outline" onClick={retry}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button></div>;
  return null;
}

export default function AdminClassroomHub() {
  const { classroomId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab === "messages"
    ? "chat"
    : tabs.some(([value]) => value === requestedTab) ? requestedTab! : "overview";
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [evaluationFilters, setEvaluationFilters] = useState({ student: "", subject: "", week: "", from: "", to: "", page: 1 });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [assignmentFilters, setAssignmentFilters] = useState({ subject: "", teacher: "", status: "", search: "", from: "", to: "", page: 1 });
  const [attendanceFilters, setAttendanceFilters] = useState({ student: "", session: "", status: "", from: "", to: "", page: 1 });

  const details = useQuery({
    queryKey: ["admin-classroom-hub", classroomId],
    queryFn: () => classroomZoomApi.getClassroom(classroomId),
    enabled: Boolean(classroomId), retry: false,
  });
  const subjects = useQuery({
    queryKey: ["admin-classroom-hub-subjects", classroomId],
    queryFn: () => classroomRecordingsApi.listSubjects(classroomId),
    enabled: Boolean(classroomId), retry: false,
  });
  const students = useQuery({
    queryKey: ["admin-classroom-hub-students", classroomId],
    queryFn: () => classroomRecordingsApi.listStudents(classroomId),
    enabled: Boolean(classroomId), retry: false,
  });
  const sessions = useQuery({
    queryKey: ["admin-classroom-hub-sessions", classroomId],
    queryFn: () => classroomRecordingsApi.listSessions(classroomId),
    enabled: Boolean(classroomId) && activeTab === "sessions", retry: false,
  });
  const recordings = useQuery({
    queryKey: ["admin-classroom-hub-recordings", classroomId],
    queryFn: () => classroomRecordingsApi.listRecordings(classroomId),
    enabled: Boolean(classroomId) && activeTab === "recordings", retry: false,
  });
  const sessionDetails = useQuery({
    queryKey: ["admin-classroom-hub-session", selectedSessionId],
    queryFn: () => classroomRecordingsApi.getSession(selectedSessionId),
    enabled: Boolean(selectedSessionId), retry: false,
  });
  const sessionReport = useQuery({
    queryKey: ["admin-classroom-hub-session-report", selectedSessionId],
    queryFn: () => classroomRecordingsApi.getSessionReport(selectedSessionId),
    enabled: Boolean(selectedSessionId), retry: false,
  });
  const evaluationQuery = useQuery({
    queryKey: ["admin-classroom-hub-evaluations", classroomId, evaluationFilters],
    queryFn: () => adminEvaluationsApi.listEvaluations({
      classroom: classroomId,
      student: evaluationFilters.student || undefined,
      subject: evaluationFilters.subject || undefined,
      week: evaluationFilters.week ? Number(evaluationFilters.week) : undefined,
      from: evaluationFilters.from || undefined,
      to: evaluationFilters.to || undefined,
      page: evaluationFilters.page,
      limit: 20,
    }),
    enabled: Boolean(classroomId) && activeTab === "evaluations", retry: false,
  });
  const evaluationDetails = useQuery({
    queryKey: ["admin-classroom-hub-evaluation", selectedEvaluationId],
    queryFn: () => adminEvaluationsApi.getEvaluation(selectedEvaluationId),
    enabled: Boolean(selectedEvaluationId), retry: false,
  });
  const assignmentQuery = useQuery({
    queryKey: ["admin-classroom-hub-assignments", classroomId, assignmentFilters],
    queryFn: () => adminAssignmentsApi.listAssignments({
      classroom: classroomId,
      subject: assignmentFilters.subject || undefined,
      teacher: assignmentFilters.teacher || undefined,
      status: (assignmentFilters.status || undefined) as "active" | "finished" | undefined,
      search: assignmentFilters.search || undefined,
      from: assignmentFilters.from || undefined,
      to: assignmentFilters.to || undefined,
      page: assignmentFilters.page,
      limit: 20,
    }),
    enabled: Boolean(classroomId) && activeTab === "assignments", retry: false,
  });
  const assignmentDetails = useQuery({
    queryKey: ["admin-classroom-hub-assignment", selectedAssignmentId],
    queryFn: () => adminAssignmentsApi.getAssignment(selectedAssignmentId),
    enabled: Boolean(selectedAssignmentId), retry: false,
  });
  const submissions = useQuery({
    queryKey: ["admin-classroom-hub-assignment-submissions", selectedAssignmentId],
    queryFn: () => adminAssignmentsApi.listSubmissions(selectedAssignmentId, { page: 1, limit: 20 }),
    enabled: Boolean(selectedAssignmentId), retry: false,
  });
  const submissionDetails = useQuery({
    queryKey: ["admin-classroom-hub-submission", selectedAssignmentId, selectedSubmissionId],
    queryFn: () => adminAssignmentsApi.getSubmission(selectedAssignmentId, selectedSubmissionId),
    enabled: Boolean(selectedAssignmentId && selectedSubmissionId), retry: false,
  });
  const attendanceQuery = useQuery({
    queryKey: ["admin-classroom-hub-attendance", classroomId, attendanceFilters],
    queryFn: () => adminClassroomAttendanceApi.listClassroomAttendance(classroomId, {
      student: attendanceFilters.student || undefined,
      session: attendanceFilters.session || undefined,
      status: (attendanceFilters.status || undefined) as AdminAttendanceStatus | undefined,
      from: attendanceFilters.from || undefined,
      to: attendanceFilters.to || undefined,
      page: attendanceFilters.page,
      limit: 20,
    }),
    enabled: Boolean(classroomId) && activeTab === "attendance", retry: false,
  });

  const subjectItems = subjects.data?.data?.subjects || [];
  const studentItems = students.data?.data || [];
  const classroom = details.data?.data;
  const zoom = useMemo(() => normalizeZoomState(classroom), [classroom]);
  const recordingsItems = Array.isArray(recordings.data?.data) ? recordings.data.data : recordings.data?.data?.recordings || recordings.data?.data?.data || [];
  const sessionsItems = Array.isArray(sessions.data?.data) ? sessions.data.data : sessions.data?.data?.sessions || sessions.data?.data?.data || [];
  const selectedSession = sessionDetails.data?.data;
  const evaluationItems = evaluationQuery.data?.data || [];
  const evaluationPagination = evaluationQuery.data?.pagination;
  const selectedEvaluation = evaluationDetails.data?.data;
  const assignmentItems = assignmentQuery.data?.data || [];
  const assignmentPagination = assignmentQuery.data?.pagination;
  const selectedAssignment = assignmentDetails.data?.data;
  const submissionItems = submissions.data?.data || [];
  const assignmentTeachers = Array.from(new Map(subjectItems.filter((item) => item.teacher?.id).map((item) => [item.teacher!.id, item.teacher!.name])).entries());
  const attendanceItems = attendanceQuery.data?.data || [];
  const attendancePagination = attendanceQuery.data?.pagination;
  const attendanceSessions = Array.from(new Map([
    ...sessionsItems.map((session) => [sessionId(session), sessionTitle(session)] as [string, string]),
    ...attendanceItems.filter((item) => item.session?.id).map((item) => [item.session!.id!, item.session!.name || item.session!.id!] as [string, string]),
  ]));

  const changeTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next);
  };

  const changeEvaluationFilter = (key: "student" | "subject" | "week" | "from" | "to", value: string) => {
    setEvaluationFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };
  const changeAssignmentFilter = (key: "subject" | "teacher" | "status" | "search" | "from" | "to", value: string) => {
    setAssignmentFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };
  const changeAttendanceFilter = (key: "student" | "session" | "status" | "from" | "to", value: string) => {
    setAttendanceFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const evaluationStudentName = (evaluation?: AdminEvaluation | null) => evaluation?.student?.user?.fullName || evaluation?.student?.user?.email || "—";
  const evaluationDate = (value?: string) => value ? new Date(value).toLocaleDateString("ar-EG-u-ca-gregory") : "—";
  const assignmentDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("ar-EG-u-ca-gregory") : "—";
  const assignmentStatusLabel: Record<string, string> = { active: "نشط", finished: "منتهٍ" };
  const attendanceStatusLabel: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر" };

  if (!classroomId) return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl"><Card><CardContent className="py-12 text-center">الفصل غير موجود.</CardContent></Card></div></DashboardLayout>;
  if (details.isLoading) return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl space-y-5"><Skeleton className="h-32" /><Skeleton className="h-64" /></div></DashboardLayout>;
  if (details.isError || !classroom) return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl"><Card><CardContent className="grid gap-3 py-12 text-center"><p>{errorText(details.error)}</p><Button variant="outline" onClick={() => void details.refetch()}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card></div></DashboardLayout>;

  const zoomState = zoomDisplayState(classroom);
  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <Breadcrumb dir="rtl"><BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden"><BreadcrumbItem><BreadcrumbLink asChild><Link to="/admin">الرئيسية</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="rotate-180" /><BreadcrumbItem><BreadcrumbLink asChild><Link to="/admin/classrooms">الفصول</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="rotate-180" /><BreadcrumbItem className="min-w-0"><BreadcrumbPage className="block max-w-[45vw] truncate sm:max-w-md" title={display(classroom.name)}>{display(classroom.name)}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">إدارة الفصل</h1><p className="mt-1 truncate text-sm text-muted-foreground" title={display(classroom.name)}>{display(classroom.name)}</p></div><Badge variant={classroom.isActive === false ? "outline" : "default"}>{classroom.isActive === false ? "غير نشط" : "نشط"}</Badge></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">المنهج</p><p className="font-semibold">{referenceName(classroom.curriculum) || "—"}</p></div><div><p className="text-xs text-muted-foreground">الصف</p><p className="font-semibold">{referenceName(classroom.grade) || "—"}</p></div><div><p className="text-xs text-muted-foreground">الطلاب</p><p className="font-semibold">{students.isSuccess ? studentItems.length : "—"}</p></div><div><p className="text-xs text-muted-foreground">Zoom</p><p className="font-semibold">{zoomState === "ready" ? "مرتبط" : zoomState === "creating" ? "جارٍ التجهيز" : zoomState === "failed" ? "فشل التجهيز" : "غير مرتبط"}</p></div></CardContent></Card>
    <Tabs value={activeTab} onValueChange={changeTab} dir="rtl"><div className="overflow-x-auto"><TabsList className="min-w-max">{tabs.map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList></div>
      <TabsContent value="overview" className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" />المواد والمعلمون</CardTitle></CardHeader><CardContent><QueryState loading={subjects.isLoading} error={subjects.error} retry={() => void subjects.refetch()} />{subjects.isSuccess && (!subjectItems.length ? <p className="text-muted-foreground">لا توجد مواد مرتبطة بهذا الفصل.</p> : <div className="space-y-2"><div className="grid grid-cols-2 gap-3 px-3 text-xs font-semibold text-muted-foreground"><span>المادة</span><span>المعلم</span></div>{subjectItems.map((subject) => <div key={subject.classroomSubjectId || subject.id} className="grid grid-cols-2 gap-3 rounded-lg border p-3"><span className="min-w-0 break-words font-medium">{subject.name || subject.subject?.name || "مادة"}</span><span className="min-w-0 break-words text-sm text-muted-foreground">{subject.teacher?.name || "—"}</span></div>)}</div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />الطلاب</CardTitle></CardHeader><CardContent><QueryState loading={students.isLoading} error={students.error} retry={() => void students.refetch()} />{students.isSuccess && (!studentItems.length ? <p className="text-muted-foreground">لا يوجد طلاب مرتبطون بهذا الفصل.</p> : <div className="space-y-2">{studentItems.map((student) => <div key={student.studentId} className="rounded-lg border p-3">{student.fullName}</div>)}</div>)}</CardContent></Card></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button variant="outline" onClick={() => changeTab("schedule")}><CalendarDays className="ml-2 h-4 w-4" />الجدول</Button><Button variant="outline" onClick={() => changeTab("sessions")}><Eye className="ml-2 h-4 w-4" />الحصص</Button><Button variant="outline" onClick={() => changeTab("assignments")}><ClipboardList className="ml-2 h-4 w-4" />الواجبات</Button><Button variant="outline" onClick={() => changeTab("chat")}><MessageSquare className="ml-2 h-4 w-4" />المحادثات</Button></div></TabsContent>
      <TabsContent value="sessions" className="space-y-4"><Card><CardHeader><CardTitle>حصص الفصل</CardTitle></CardHeader><CardContent><QueryState loading={sessions.isLoading} error={sessions.error} retry={() => void sessions.refetch()} />{sessions.isSuccess && (!sessionsItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد حصص مسجلة لهذا الفصل.</p> : <div className="space-y-2">{sessionsItems.map((session) => { const id = sessionId(session); const subject = sessionSubject(session); const teacher = sessionTeacher(session); return <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{sessionTitle(session)}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">{(session.startAt || session.scheduledStartAt) && <span>{dateLabel(session.startAt || session.scheduledStartAt)}</span>}{session.endAt && <span>إلى {dateLabel(session.endAt)}</span>}{subject && <span>{subject}</span>}{teacher && <span>المعلم: {teacher}</span>}</div></div><div className="flex items-center gap-2"><Badge variant="outline">{statusLabel[session.status || ""] || display(session.status)}</Badge><Button size="sm" variant="outline" onClick={() => setSelectedSessionId(id)} disabled={!session.id && !session._id}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></div></div>; })}</div>)}</CardContent></Card>
        {selectedSessionId && <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>تفاصيل الحصة</CardTitle><Button variant="ghost" onClick={() => setSelectedSessionId("")}>إغلاق</Button></CardHeader><CardContent><QueryState loading={sessionDetails.isLoading} error={sessionDetails.error} retry={() => void sessionDetails.refetch()} />{sessionDetails.isSuccess && selectedSession && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">الاسم</p><p className="font-semibold">{sessionTitle(selectedSession)}</p></div>{selectedSession.status && <div><p className="text-xs text-muted-foreground">الحالة</p><p>{statusLabel[selectedSession.status] || selectedSession.status}</p></div>}{(selectedSession.startAt || selectedSession.scheduledStartAt) && <div><p className="text-xs text-muted-foreground">البداية</p><p>{dateLabel(selectedSession.startAt || selectedSession.scheduledStartAt)}</p></div>}{selectedSession.endAt && <div><p className="text-xs text-muted-foreground">النهاية</p><p>{dateLabel(selectedSession.endAt)}</p></div>}{sessionSubject(selectedSession) && <div><p className="text-xs text-muted-foreground">المادة</p><p>{sessionSubject(selectedSession)}</p></div>}{sessionTeacher(selectedSession) && <div><p className="text-xs text-muted-foreground">المعلم</p><p>{sessionTeacher(selectedSession)}</p></div>}</div><div className="rounded-lg border p-3"><p className="mb-2 font-semibold">تقرير الحصة</p><QueryState loading={sessionReport.isLoading} error={sessionReport.error} retry={() => void sessionReport.refetch()} />{sessionReport.isSuccess && <div className="text-sm text-muted-foreground"><p>حالة التقرير: {display(sessionReport.data.data.status)}</p>{sessionReport.data.pagination && <p>عدد المشاركين: {sessionReport.data.pagination.total}</p>}</div>}</div></div>}</CardContent></Card>}
      </TabsContent>
      <TabsContent value="recordings"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" />تسجيلات الفصل</CardTitle></CardHeader><CardContent><QueryState loading={recordings.isLoading} error={recordings.error} retry={() => void recordings.refetch()} />{recordings.isSuccess && (!recordingsItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد تسجيلات جاهزة لهذا الفصل.</p> : <div className="space-y-2">{recordingsItems.map((recording) => { const url = recording.localUrl || recording.shareUrl || recording.recordingLink; return <div key={recording.sessionId || recording.recordingLink} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><span>{recording.sessionName}</span>{url ? <Button variant="link" className="h-auto p-0" onClick={() => setSelectedRecording({ sessionName: recording.sessionName, recordingLink: url })}><Play className="ml-1 h-4 w-4" />تشغيل التسجيل</Button> : <span className="text-sm text-muted-foreground">التسجيل غير متاح</span>}</div>; })}</div>)}</CardContent></Card><RecordingPlayerModal recording={selectedRecording} onClose={() => setSelectedRecording(null)} /></TabsContent>
      <TabsContent value="evaluations" className="space-y-4"><Card><CardHeader><CardTitle>تقييمات الفصل</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><AdminSearchableSelect label="الطالب" value={evaluationFilters.student} placeholder="اختر الطالب" allLabel="كل الطلاب" options={studentItems.map((student) => ({ value: student.studentId, label: student.fullName }))} onChange={(value) => changeEvaluationFilter("student", value || "")} /><div className="space-y-1"><Label>المادة</Label><Select value={evaluationFilters.subject || "all"} onValueChange={(value) => changeEvaluationFilter("subject", value === "all" ? "" : value)}><SelectTrigger><SelectValue placeholder="كل المواد" /></SelectTrigger><SelectContent><SelectItem value="all">كل المواد</SelectItem>{subjectItems.map((subject) => <SelectItem key={subject.subjectId || subject.classroomSubjectId} value={subject.subjectId}>{subject.name || subject.subject?.name || "مادة"}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="evaluation-week">الأسبوع</Label><Input id="evaluation-week" type="number" min="1" placeholder="رقم الأسبوع" value={evaluationFilters.week} onChange={(event) => changeEvaluationFilter("week", event.target.value.replace(/\D/g, ""))} /></div><div className="space-y-1"><Label htmlFor="evaluation-from">من</Label><Input id="evaluation-from" type="date" value={evaluationFilters.from} onChange={(event) => changeEvaluationFilter("from", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="evaluation-to">إلى</Label><Input id="evaluation-to" type="date" value={evaluationFilters.to} onChange={(event) => changeEvaluationFilter("to", event.target.value)} /></div></div><QueryState loading={evaluationQuery.isLoading} error={evaluationQuery.error} retry={() => void evaluationQuery.refetch()} />{evaluationQuery.isSuccess && (!evaluationItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد تقييمات لهذا الفصل.</p> : <div className="space-y-2">{evaluationItems.map((evaluation) => <div key={evaluation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{evaluationStudentName(evaluation)}</p><p className="text-sm text-muted-foreground">{evaluation.subject?.name || "—"} · أسبوع {evaluationDate(evaluation.weekStart)}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="outline">الحضور: {display(evaluation.attendance)}</Badge><Badge variant="outline">المشاركة: {display(evaluation.participation)}</Badge><Badge variant="outline">الواجب: {display(evaluation.homework)}</Badge><Badge variant="outline">السلوك: {display(evaluation.behavior)}</Badge></div></div><Button size="sm" variant="outline" onClick={() => setSelectedEvaluationId(evaluation.id)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></div>)}</div>)}{evaluationQuery.isSuccess && evaluationPagination && evaluationPagination.last_page > 1 && <div className="flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">صفحة {evaluationPagination.current_page} من {evaluationPagination.last_page} · {evaluationPagination.total} تقييم</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={evaluationPagination.current_page <= 1} onClick={() => setEvaluationFilters((current) => ({ ...current, page: current.page - 1 }))}>السابقة</Button><Button size="sm" variant="outline" disabled={evaluationPagination.current_page >= evaluationPagination.last_page} onClick={() => setEvaluationFilters((current) => ({ ...current, page: current.page + 1 }))}>التالية</Button></div></div>}</CardContent></Card>
        {selectedEvaluationId && <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>تفاصيل التقييم</CardTitle><Button variant="ghost" onClick={() => setSelectedEvaluationId("")}>إغلاق</Button></CardHeader><CardContent><QueryState loading={evaluationDetails.isLoading} error={evaluationDetails.error} retry={() => void evaluationDetails.refetch()} />{evaluationDetails.isSuccess && selectedEvaluation && <div className="grid gap-3 sm:grid-cols-2">{[["الطالب", evaluationStudentName(selectedEvaluation)], ["الفصل", selectedEvaluation.classroom?.name], ["المادة", selectedEvaluation.subject?.name], ["بداية الأسبوع", evaluationDate(selectedEvaluation.weekStart)], ["الحضور", selectedEvaluation.attendance], ["المشاركة", selectedEvaluation.participation], ["الواجب", selectedEvaluation.homework], ["السلوك", selectedEvaluation.behavior], ["النقاط الإضافية", selectedEvaluation.bonus], ["ملاحظات", selectedEvaluation.notes], ["أنشأه", selectedEvaluation.createdByRole], ["عدله", selectedEvaluation.updatedByRole], ["تاريخ الإنشاء", evaluationDate(selectedEvaluation.createdAt)], ["تاريخ التعديل", evaluationDate(selectedEvaluation.updatedAt)]].map(([label, value]) => value !== undefined && value !== null && value !== "" && <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words">{String(value)}</p></div>)}</div>}</CardContent></Card>}
      </TabsContent>
      <TabsContent value="attendance" className="space-y-4"><Card><CardHeader><CardTitle>حضور وغياب الفصل</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><AdminSearchableSelect label="الطالب" value={attendanceFilters.student} placeholder="اختر الطالب" allLabel="كل الطلاب" options={studentItems.map((student) => ({ value: student.studentId, label: student.fullName }))} onChange={(value) => changeAttendanceFilter("student", value || "")} /><div className="space-y-1"><Label>الجلسة</Label><Select value={attendanceFilters.session || "all"} onValueChange={(value) => changeAttendanceFilter("session", value === "all" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الجلسات</SelectItem>{attendanceSessions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>الحالة</Label><Select value={attendanceFilters.status || "all"} onValueChange={(value) => changeAttendanceFilter("status", value === "all" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{(["present", "absent", "late"] as const).map((status) => <SelectItem key={status} value={status}>{attendanceStatusLabel[status]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="attendance-from">من</Label><Input id="attendance-from" type="date" value={attendanceFilters.from} onChange={(event) => changeAttendanceFilter("from", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="attendance-to">إلى</Label><Input id="attendance-to" type="date" value={attendanceFilters.to} onChange={(event) => changeAttendanceFilter("to", event.target.value)} /></div></div><QueryState loading={attendanceQuery.isLoading} error={attendanceQuery.error} retry={() => void attendanceQuery.refetch()} />{attendanceQuery.isSuccess && (!attendanceItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد سجلات حضور لهذا الفصل.</p> : <div className="space-y-2">{attendanceItems.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{record.student?.name || "—"}</p><p className="text-sm text-muted-foreground">{record.session?.name || "—"} · {record.joinedAt ? dateLabel(record.joinedAt) : record.createdAt ? dateLabel(record.createdAt) : "—"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{attendanceStatusLabel[record.status || ""] || record.status || "—"}</Badge>{record.duration !== null && record.duration !== undefined && <span className="text-xs text-muted-foreground">المدة: {record.duration}</span>}</div></div>)}</div>)}{attendanceQuery.isSuccess && attendancePagination && attendancePagination.last_page > 1 && <div className="flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">صفحة {attendancePagination.current_page} من {attendancePagination.last_page} · {attendancePagination.total} سجل</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={attendancePagination.current_page <= 1} onClick={() => setAttendanceFilters((current) => ({ ...current, page: current.page - 1 }))}>السابقة</Button><Button size="sm" variant="outline" disabled={attendancePagination.current_page >= attendancePagination.last_page} onClick={() => setAttendanceFilters((current) => ({ ...current, page: current.page + 1 }))}>التالية</Button></div></div>}</CardContent></Card></TabsContent>
      <TabsContent value="assignments" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />واجبات الفصل</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><div className="space-y-1 xl:col-span-2"><Label htmlFor="hub-assignment-search">بحث</Label><Input id="hub-assignment-search" placeholder="ابحث في الواجبات" value={assignmentFilters.search} onChange={(event) => changeAssignmentFilter("search", event.target.value)} /></div><div className="space-y-1"><Label>المادة</Label><Select value={assignmentFilters.subject || "all"} onValueChange={(value) => changeAssignmentFilter("subject", value === "all" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل المواد</SelectItem>{subjectItems.map((subject) => <SelectItem key={subject.subjectId || subject.classroomSubjectId} value={subject.subjectId}>{subject.name || subject.subject?.name || "مادة"}</SelectItem>)}</SelectContent></Select></div><AdminSearchableSelect label="المعلم" value={assignmentFilters.teacher} placeholder="اختر المعلم" allLabel="كل المعلمين" options={assignmentTeachers.map(([id, name]) => ({ value: id, label: name || id }))} onChange={(value) => changeAssignmentFilter("teacher", value || "")} /><div className="space-y-1"><Label>الحالة</Label><Select value={assignmentFilters.status || "all"} onValueChange={(value) => changeAssignmentFilter("status", value === "all" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="active">نشط</SelectItem><SelectItem value="finished">منتهٍ</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label htmlFor="hub-assignment-from">من</Label><Input id="hub-assignment-from" type="date" value={assignmentFilters.from} onChange={(event) => changeAssignmentFilter("from", event.target.value)} /></div><div className="space-y-1"><Label htmlFor="hub-assignment-to">إلى</Label><Input id="hub-assignment-to" type="date" value={assignmentFilters.to} onChange={(event) => changeAssignmentFilter("to", event.target.value)} /></div></div><QueryState loading={assignmentQuery.isLoading} error={assignmentQuery.error} retry={() => void assignmentQuery.refetch()} />{assignmentQuery.isSuccess && (!assignmentItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد واجبات لهذا الفصل.</p> : <div className="space-y-2">{assignmentItems.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{assignment.title || "بدون عنوان"}</p><p className="text-sm text-muted-foreground">{assignment.subject?.name || "—"} · الاستحقاق: {assignmentDate(assignment.dueDate)}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="outline">{assignment.teacher?.user?.fullName || assignment.teacher?.user?.email || "—"}</Badge><Badge variant={assignment.status === "active" ? "default" : "outline"}>{assignmentStatusLabel[assignment.status || ""] || assignment.status || "—"}</Badge></div></div><Button size="sm" variant="outline" onClick={() => setSelectedAssignmentId(assignment.id)}><Eye className="ml-1 h-4 w-4" />التفاصيل</Button></div>)}</div>)}{assignmentQuery.isSuccess && assignmentPagination && assignmentPagination.last_page > 1 && <div className="flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">صفحة {assignmentPagination.current_page} من {assignmentPagination.last_page} · {assignmentPagination.total} واجب</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={assignmentPagination.current_page <= 1} onClick={() => setAssignmentFilters((current) => ({ ...current, page: current.page - 1 }))}>السابقة</Button><Button size="sm" variant="outline" disabled={assignmentPagination.current_page >= assignmentPagination.last_page} onClick={() => setAssignmentFilters((current) => ({ ...current, page: current.page + 1 }))}>التالية</Button></div></div>}</CardContent></Card>
        {selectedAssignmentId && <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>تفاصيل الواجب</CardTitle><Button variant="ghost" onClick={() => { setSelectedAssignmentId(""); setSelectedSubmissionId(""); }}>إغلاق</Button></CardHeader><CardContent><QueryState loading={assignmentDetails.isLoading} error={assignmentDetails.error} retry={() => void assignmentDetails.refetch()} />{assignmentDetails.isSuccess && selectedAssignment && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{[["العنوان", selectedAssignment.title], ["الوصف", selectedAssignment.description], ["المادة", selectedAssignment.subject?.name], ["المعلم", selectedAssignment.teacher?.user?.fullName || selectedAssignment.teacher?.user?.email], ["الحالة", assignmentStatusLabel[selectedAssignment.status || ""] || selectedAssignment.status], ["الدرجة الكلية", selectedAssignment.totalPoints], ["تاريخ الاستحقاق", assignmentDate(selectedAssignment.dueDate)], ["تاريخ الإنشاء", assignmentDate(selectedAssignment.createdAt)]].map(([label, value]) => value !== undefined && value !== null && value !== "" && <div key={label} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm">{String(value)}</p></div>)}</div>{selectedAssignment.attachment && <a className="text-sm text-primary underline" href={selectedAssignment.attachment} target="_blank" rel="noreferrer">عرض المرفق</a>}<div className="rounded-lg border"><div className="border-b p-3"><h3 className="font-semibold">التسليمات {submissions.data && `(${submissions.data.pagination.total})`}</h3></div><div className="p-3"><QueryState loading={submissions.isLoading} error={submissions.error} retry={() => void submissions.refetch()} />{submissions.isSuccess && (!submissionItems.length ? <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تسليمات لهذا الواجب.</p> : <div className="space-y-2">{submissionItems.map((submission) => <div key={submission.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{submission.student?.user?.fullName || submission.student?.user?.email || "—"}</span><span className="text-muted-foreground">{submission.status || "—"} · {submission.submittedAt ? assignmentDate(submission.submittedAt) : "—"}</span><Button size="sm" variant="outline" onClick={() => setSelectedSubmissionId(submission.id)}>التفاصيل</Button></div>)}</div>)}</div></div></div>}</CardContent></Card>}
        {selectedSubmissionId && <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>تفاصيل التسليم</CardTitle><Button variant="ghost" onClick={() => setSelectedSubmissionId("")}>إغلاق</Button></CardHeader><CardContent><QueryState loading={submissionDetails.isLoading} error={submissionDetails.error} retry={() => void submissionDetails.refetch()} />{submissionDetails.isSuccess && submissionDetails.data.data && <div className="grid gap-3 sm:grid-cols-2">{[["الطالب", submissionDetails.data.data.student?.user?.fullName || submissionDetails.data.data.student?.user?.email], ["الحالة", submissionDetails.data.data.status], ["الدرجة", submissionDetails.data.data.score], ["تاريخ التسليم", assignmentDate(submissionDetails.data.data.submittedAt)], ["تاريخ الإنشاء", assignmentDate(submissionDetails.data.data.createdAt)]].map(([label, value]) => value !== undefined && value !== null && value !== "" && <div key={label} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm">{String(value)}</p></div>)}</div>}</CardContent></Card>}
      </TabsContent>
      <TabsContent value="chat"><AdminClassroomChat classroomId={classroomId} active={activeTab === "chat"} /></TabsContent>
      <TabsContent value="schedule">{activeTab === "schedule" && <ClassroomScheduleManagement classroomId={classroomId} embedded />}</TabsContent>
      <TabsContent value="zoom">{activeTab === "zoom" && <ClassroomZoomManagement classroomId={classroomId} embedded />}</TabsContent>
    </Tabs>
  </div></DashboardLayout>;
}
