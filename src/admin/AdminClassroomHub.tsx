import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Eye, Loader2, MessageSquare, Play, RefreshCw, School, Users, UserPlus, Video } from "lucide-react";
import { ApiError } from "@/api/client";
import { adminAssignmentsApi } from "@/api/adminAssignmentsApi";
import { adminClassroomAttendanceApi, type AdminAttendanceStatus } from "@/api/adminClassroomAttendanceApi";
import { classroomRecordingsApi } from "@/api/classroomRecordingsApi";
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
import { toast } from "sonner";

const tabs = [
  ["overview", "نظرة عامة"], ["schedule", "الجدول"], ["recordings", "التسجيلات"],
  ["assignments", "الواجبات"], ["chat", "المحادثات"],
  ["attendance", "الحضور والغياب"], ["zoom", "Zoom"],
] as const;

const errorText = (error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) return "ليس لديك صلاحية لعرض هذا الفصل.";
  if (status === 404) return "الفصل غير موجود أو لم يعد متاحًا.";
  return "تعذر تحميل بيانات الفصل. تحقق من الاتصال وحاول مرة أخرى.";
};

const display = (value?: string | null) => value || "—";
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("ar-EG-u-ca-gregory") : "—";

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
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [assignmentFilters, setAssignmentFilters] = useState({ subject: "", teacher: "", status: "", search: "", from: "", to: "", page: 1 });
  const [attendanceFilters, setAttendanceFilters] = useState({ student: "", session: "", status: "", from: "", to: "", page: 1 });
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const queryClient = useQueryClient();

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
  const availableStudents = useQuery({
    queryKey: ["admin-classroom-available-students", classroomId, studentSearch],
    queryFn: () => classroomRecordingsApi.listAvailableStudents(classroomId, studentSearch),
    enabled: Boolean(classroomId) && activeTab === "overview",
    retry: false,
  });
  const assignStudent = useMutation({
    mutationFn: () => classroomRecordingsApi.assignStudent(classroomId, selectedStudentId),
    onSuccess: async () => {
      setSelectedStudentId("");
      toast.success("تمت إضافة الطالب إلى الفصل.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-classroom-hub-students", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-classroom-available-students", classroomId] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "تعذر إضافة الطالب إلى الفصل."),
  });
  const recordings = useQuery({
    queryKey: ["admin-classroom-hub-recordings", classroomId],
    queryFn: () => classroomRecordingsApi.listRecordings(classroomId),
    enabled: Boolean(classroomId) && activeTab === "recordings", retry: false,
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
  const availableStudentItems = availableStudents.data?.data || [];
  const classroom = details.data?.data;
  const zoom = useMemo(() => normalizeZoomState(classroom), [classroom]);
  const recordingsItems = Array.isArray(recordings.data?.data) ? recordings.data.data : recordings.data?.data?.recordings || recordings.data?.data?.data || [];
  const assignmentItems = assignmentQuery.data?.data || [];
  const assignmentPagination = assignmentQuery.data?.pagination;
  const selectedAssignment = assignmentDetails.data?.data;
  const submissionItems = submissions.data?.data || [];
  const assignmentTeachers = Array.from(new Map(subjectItems.filter((item) => item.teacher?.id).map((item) => [item.teacher!.id, item.teacher!.name])).entries());
  const attendanceItems = attendanceQuery.data?.data || [];
  const attendancePagination = attendanceQuery.data?.pagination;
  const attendanceSessions = Array.from(new Map(
    attendanceItems.filter((item) => item.session?.id).map((item) => [item.session!.id!, item.session!.name || item.session!.id!] as [string, string]),
  ));

  const changeTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next);
  };

  const changeAssignmentFilter = (key: "subject" | "teacher" | "status" | "search" | "from" | "to", value: string) => {
    setAssignmentFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };
  const changeAttendanceFilter = (key: "student" | "session" | "status" | "from" | "to", value: string) => {
    setAttendanceFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

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
      <TabsContent value="overview" className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" />المواد والمعلمون</CardTitle></CardHeader><CardContent><QueryState loading={subjects.isLoading} error={subjects.error} retry={() => void subjects.refetch()} />{subjects.isSuccess && (!subjectItems.length ? <p className="text-muted-foreground">لا توجد مواد مرتبطة بهذا الفصل.</p> : <div className="space-y-2"><div className="grid grid-cols-2 gap-3 px-3 text-xs font-semibold text-muted-foreground"><span>المادة</span><span>المعلم</span></div>{subjectItems.map((subject) => <div key={subject.classroomSubjectId || subject.id} className="grid grid-cols-2 gap-3 rounded-lg border p-3"><span className="min-w-0 break-words font-medium">{subject.name || subject.subject?.name || "مادة"}</span><span className="min-w-0 break-words text-sm text-muted-foreground">{subject.teacher?.name || "—"}</span></div>)}</div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />الطلاب</CardTitle></CardHeader><CardContent className="space-y-4"><QueryState loading={students.isLoading} error={students.error} retry={() => void students.refetch()} />{students.isSuccess && (!studentItems.length ? <p className="text-muted-foreground">لا يوجد طلاب مرتبطون بهذا الفصل.</p> : <div className="space-y-2">{studentItems.map((student) => <div key={student.studentId} className="rounded-lg border p-3">{student.fullName}</div>)}</div>)}<div className="border-t pt-4"><p className="mb-2 font-semibold">إضافة طالب للفصل</p><p className="mb-3 text-xs text-muted-foreground">يتم عرض الطلاب المطابقين تلقائيًا لمنهج وصف هذا الفصل.</p><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><AdminSearchableSelect label="الطالب" value={selectedStudentId} placeholder="اختر طالبًا" options={availableStudentItems.map((student) => ({ value: student.id, label: student.fullName, searchText: student.email }))} onChange={(value) => setSelectedStudentId(value || "")} onSearch={setStudentSearch} loading={availableStudents.isLoading} error={availableStudents.isError} noOptionsLabel="لا يوجد طلاب مؤهلون لهذا الفصل." emptyLabel="لا توجد نتائج مطابقة." searchPlaceholder="ابحث باسم الطالب أو البريد الإلكتروني" /><Button className="self-end" onClick={() => assignStudent.mutate()} disabled={!selectedStudentId || assignStudent.isPending}>{assignStudent.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UserPlus className="ml-2 h-4 w-4" />}إضافة الطالب</Button></div></div></CardContent></Card></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Button variant="outline" onClick={() => changeTab("schedule")}><CalendarDays className="ml-2 h-4 w-4" />الجدول</Button><Button variant="outline" onClick={() => changeTab("assignments")}><ClipboardList className="ml-2 h-4 w-4" />الواجبات</Button><Button variant="outline" onClick={() => changeTab("chat")}><MessageSquare className="ml-2 h-4 w-4" />المحادثات</Button></div></TabsContent>
      <TabsContent value="recordings"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" />تسجيلات الفصل</CardTitle></CardHeader><CardContent><QueryState loading={recordings.isLoading} error={recordings.error} retry={() => void recordings.refetch()} />{recordings.isSuccess && (!recordingsItems.length ? <p className="py-8 text-center text-muted-foreground">لا توجد تسجيلات جاهزة لهذا الفصل.</p> : <div className="space-y-2">{recordingsItems.map((recording) => { const url = recording.localUrl || recording.shareUrl || recording.recordingLink; return <div key={recording.sessionId || recording.recordingLink} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><span>{recording.sessionName}</span>{url ? <Button variant="link" className="h-auto p-0" onClick={() => setSelectedRecording({ sessionName: recording.sessionName, recordingLink: url })}><Play className="ml-1 h-4 w-4" />تشغيل التسجيل</Button> : <span className="text-sm text-muted-foreground">التسجيل غير متاح</span>}</div>; })}</div>)}</CardContent></Card><RecordingPlayerModal recording={selectedRecording} onClose={() => setSelectedRecording(null)} /></TabsContent>
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
