import { useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, MessageCircle, Video } from "lucide-react";
import { classroomRecordingsApi, type SessionRecording } from "@/api/classroomRecordingsApi";
import { studentAssignmentsApi } from "@/api/studentAssignmentsApi";
import { studentClassroomsApi } from "@/api/studentClassroomsApi";
import { getUnifiedScheduleWeek } from "@/api/scheduleApi";
import CourseClassroomChat from "@/components/CourseClassroomChat";
import ClassroomPlansPanel from "@/components/ClassroomPlansPanel";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";

const recordingsFrom = (data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] }) => Array.isArray(data) ? data : data.recordings || data.data || [];
const dateLabel = (value: string | undefined, locale: string) => value ? new Date(value).toLocaleString(locale, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}) : "—";
const lessonDayLabel = (value: string | null, locale: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(locale, { weekday: "long" }) : "—";
const lessonTimeLabel = (value: string | undefined, locale: string) => value ? new Date(`2000-01-01T${value}:00`).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true }) : "—";
const currentWeekStart = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 1) % 7));
  return date.toISOString().slice(0, 10);
};

export default function StudentClassroomDetails() {
  const { classroomId = "" } = useParams<{ classroomId: string }>();
  const [searchParams] = useSearchParams();
  const { pick, isArabic } = useLanguage();
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US";
  const classrooms = useQuery({ queryKey: ["student-classrooms"], queryFn: studentClassroomsApi.myEnrollments });
  const classroom = (classrooms.data || []).find((item) => (typeof item.classroom === "string" ? item.classroom : item.classroom.id) === classroomId && item.status === "approved");
  const recordings = useQuery({ queryKey: ["student-classroom-recordings", classroomId], queryFn: async () => recordingsFrom((await classroomRecordingsApi.listRecordings(classroomId)).data), enabled: Boolean(classroomId && classroom), retry: 1 });
  const assignments = useQuery({ queryKey: ["student-classroom-assignments", classroomId], queryFn: studentAssignmentsApi.list, enabled: Boolean(classroomId && classroom), retry: 1 });
  const schedule = useQuery({ queryKey: ["student-classroom-schedule", classroomId, "unified"], queryFn: () => getUnifiedScheduleWeek(currentWeekStart()), enabled: Boolean(classroom), retry: 1 });
  const classroomAssignments = useMemo(() => (assignments.data || []).filter((item) => item.classroomId === classroomId), [assignments.data, classroomId]);
  const lessons = (schedule.data?.lessons || []).filter((item) => item.classroom.id === classroomId);

  if (classrooms.isPending) return <DashboardLayout><main className="mx-auto max-w-6xl p-6" dir="rtl">جاري تحميل الفصل...</main></DashboardLayout>;
  if (!classroom) return <DashboardLayout><main className="mx-auto max-w-6xl p-6 text-center text-destructive" dir="rtl">الفصل غير متاح.</main></DashboardLayout>;
  const classroomName = typeof classroom.classroom === "string" ? pick("الفصل", "Classroom") : classroom.classroom.name;
  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-5" dir={isArabic ? "rtl" : "ltr"}>
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{classroomName}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("تفاصيل الفصل والموارد", "Classroom details and resources")}</p></div><Link className="text-sm text-primary hover:underline" to="/portal/student/classrooms">{pick("العودة للفصول", "Back to classrooms")}</Link></div></header>
    <Tabs defaultValue={searchParams.get("tab") === "recordings" ? "recordings" : searchParams.get("tab") === "plans" ? "plans" : "overview"} dir={isArabic ? "rtl" : "ltr"}><TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-6"><TabsTrigger value="overview">{pick("نظرة عامة", "Overview")}</TabsTrigger><TabsTrigger value="schedule"><CalendarDays className="me-1 h-4 w-4" />{pick("الجدول", "Schedule")}</TabsTrigger><TabsTrigger value="recordings"><Video className="me-1 h-4 w-4" />{pick("التسجيلات", "Recordings")}</TabsTrigger><TabsTrigger value="assignments"><FileText className="me-1 h-4 w-4" />{pick("الواجبات", "Assignments")}</TabsTrigger><TabsTrigger value="plans"><FileText className="me-1 h-4 w-4" />{pick("الخطط", "Plans")}</TabsTrigger><TabsTrigger value="chat"><MessageCircle className="me-1 h-4 w-4" />{pick("المحادثة", "Chat")}</TabsTrigger></TabsList>
      <TabsContent value="plans" className="mt-5"><ClassroomPlansPanel classroomId={classroomId} /></TabsContent>
      <TabsContent value="overview" className="mt-5"><div className="grid gap-4 sm:grid-cols-3"><Summary label={pick("الحصص", "Lessons")} value={lessons.length} icon={<CalendarDays className="h-5 w-5" />} /><Summary label={pick("التسجيلات", "Recordings")} value={recordings.data?.length || 0} icon={<Video className="h-5 w-5" />} /><Summary label={pick("الواجبات", "Assignments")} value={classroomAssignments.length} icon={<FileText className="h-5 w-5" />} /></div></TabsContent>
      <TabsContent value="schedule" className="mt-5"><ResourceState loading={schedule.isPending} error={schedule.isError} empty={!lessons.length} emptyText={pick("لا توجد حصص لهذا الفصل حاليًا.", "No lessons for this classroom currently.")}><div className="grid gap-3 md:grid-cols-2">{lessons.map((lesson) => <Card key={lesson.key}><CardContent className="space-y-2 p-4"><h2 className="font-bold">{lesson.subject.name}</h2><p className="text-sm text-muted-foreground">{lesson.classroom.name}</p><p className="text-sm">{lesson.date ? lessonDayLabel(lesson.date, locale) : lesson.day} — <span dir="rtl">من {lessonTimeLabel(lesson.startTime, locale)}{lesson.endTime ? ` إلى ${lessonTimeLabel(lesson.endTime, locale)}` : ""}</span></p><Badge variant="outline">{lesson.activeSession?.status || pick("مجدولة", "Scheduled")}</Badge></CardContent></Card>)}</div></ResourceState></TabsContent>
      <TabsContent value="recordings" className="mt-5"><ResourceState loading={recordings.isPending} error={recordings.isError} empty={!recordings.data?.length} emptyText={pick("لا توجد تسجيلات متاحة حاليًا.", "No recordings available currently.")}><div className="grid gap-3 md:grid-cols-2">{recordings.data?.map((item, index) => <Card key={item.sessionId || index}><CardContent className="space-y-3 p-4"><h2 className="font-bold">{item.sessionName || pick("تسجيل حصة", "Lesson recording")}</h2>{item.recordingLink ? <button type="button" className="text-sm text-primary hover:underline" onClick={() => setSelectedRecording({ sessionName: item.sessionName || pick("تسجيل حصة", "Lesson recording"), recordingLink: item.recordingLink })}>{pick("مشاهدة التسجيل", "Watch recording")}</button> : <p className="text-sm text-muted-foreground">{pick("التسجيل غير متاح للتشغيل.", "Recording is unavailable for playback.")}</p>}</CardContent></Card>)}</div></ResourceState></TabsContent>
      <TabsContent value="assignments" className="mt-5"><ResourceState loading={assignments.isPending} error={assignments.isError} empty={!classroomAssignments.length} emptyText={pick("لا توجد واجبات لهذا الفصل حاليًا.", "No assignments for this classroom currently.")}><div className="grid gap-3 md:grid-cols-2">{classroomAssignments.map((item) => <Link key={item.id} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to={`/portal/student/assignments?assignmentId=${encodeURIComponent(item.id)}`}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="space-y-2 p-4"><h2 className="font-bold text-primary">{item.title}</h2><p className="text-sm text-muted-foreground">{pick("تاريخ التسليم:", "Due:")} {dateLabel(item.dueDate, locale)}</p><Badge variant="secondary">{item.status || (item.submitted ? pick("تم التسليم", "Submitted") : pick("لم يتم التسليم", "Not submitted"))}</Badge><p className="text-sm text-muted-foreground">{pick("اضغط لعرض تفاصيل الواجب", "Click to view assignment details")}</p></CardContent></Card></Link>)}</div></ResourceState></TabsContent>
      <TabsContent value="chat" className="mt-5"><CourseClassroomChat classroomId={classroomId} /></TabsContent>
    </Tabs>
    <RecordingPlayerModal recording={selectedRecording} onClose={() => setSelectedRecording(null)} />
  </main></DashboardLayout>;
}

function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><span className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</span></CardContent></Card>; }
function ResourceState({ loading, error, empty, emptyText, children }: { loading: boolean; error: boolean; empty: boolean; emptyText: string; children: React.ReactNode }) { if (loading) return <Card><CardContent className="p-8 text-center text-muted-foreground">جاري التحميل...</CardContent></Card>; if (error) return <Card><CardContent className="p-8 text-center text-destructive">تعذر تحميل البيانات.</CardContent></Card>; return empty ? <Card><CardContent className="p-8 text-center text-muted-foreground">{emptyText}</CardContent></Card> : children; }
