import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Play } from "lucide-react";
import { coursesApi, type Course, type CourseGroup } from "@/api/coursesApi";
import { classroomRecordingsApi, type SessionRecording } from "@/api/classroomRecordingsApi";
import { courseError, refName } from "@/lib/courseUi";
import DashboardLayout from "@/layouts/DashboardLayout";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const recordingsFrom = (data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] }) => Array.isArray(data) ? data : data.recordings || data.data || [];
const objectId = (value: unknown) => typeof value === "object" && value ? String((value as { id?: string; _id?: string }).id || (value as { _id?: string })._id || "") : typeof value === "string" ? value : "";

export default function CourseEnrollmentDetail() {
  const { enrollmentId = "" } = useParams();
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const enrollmentQuery = useQuery({ queryKey: ["my-course-enrollment", enrollmentId], queryFn: () => coursesApi.myEnrollment(enrollmentId) });
  const progressQuery = useQuery({ queryKey: ["my-course-progress", enrollmentId], queryFn: () => coursesApi.myProgress(enrollmentId), enabled: Boolean(enrollmentId) });
  const enrollment = enrollmentQuery.data;
  const group = typeof enrollment?.group === "object" ? enrollment.group as CourseGroup : null;
  const classroom = typeof enrollment?.classroom === "object" ? enrollment.classroom : typeof group?.classroom === "object" ? group.classroom : null;
  const classroomId = objectId(enrollment?.classroom) || objectId(group?.classroom);
  const recordingsQuery = useQuery({ queryKey: ["course-enrollment-recordings", enrollmentId, classroomId], queryFn: async () => recordingsFrom((await classroomRecordingsApi.listRecordings(classroomId)).data), enabled: enrollment?.status === "active" && Boolean(classroomId) });
  const closeRecording = useCallback(() => setSelectedRecording(null), []);
  const course = typeof enrollment?.course === "object" ? enrollment.course as Course : null;
  const progress = progressQuery.data;
  const recordings = useMemo(() => recordingsQuery.data || [], [recordingsQuery.data]);

  if (enrollmentQuery.isLoading) return <DashboardLayout><p>جاري التحميل...</p></DashboardLayout>;
  if (enrollmentQuery.error || !enrollment) return <DashboardLayout><p className="text-destructive">{courseError(enrollmentQuery.error)}</p></DashboardLayout>;

  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{course?.name || refName(enrollment.course)}</h1><div className="mt-2 flex gap-2"><Badge>{enrollment.mode === "group" ? "جماعي" : "فردي"}</Badge><Badge variant={enrollment.status === "active" ? "default" : "secondary"}>{enrollment.status}</Badge></div></div>{enrollment.status === "active" && classroomId && <Button asChild><Link to="/portal/student/schedule"><BookOpen className="me-2 h-4 w-4"/>فتح الفصل</Link></Button>}</div>
    <div className="grid gap-5 md:grid-cols-2"><Card><CardHeader><CardTitle>تفاصيل التسجيل</CardTitle></CardHeader><CardContent className="space-y-3">{course?.description && <p>{course.description}</p>}<p><b>المعلم:</b> {refName(course?.teacher)}</p><p><b>المجموعة:</b> {group?.name || refName(enrollment.group) || "—"}</p>{classroom && <p><b>الفصل:</b> {classroom.name}</p>}<p><b>السعر:</b> {enrollment.price} {enrollment.currency}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>التقدم</CardTitle></CardHeader><CardContent>{progressQuery.isLoading ? <p>جاري تحميل التقدم...</p> : progressQuery.error ? <p className="text-sm text-destructive">{courseError(progressQuery.error)}</p> : progress ? <div className="space-y-4"><div className="flex items-end justify-between"><b className="text-2xl">{progress.completedHours} / {progress.totalHours} ساعة</b><span>{progress.percentage}%</span></div><Progress value={progress.percentage}/></div> : <p className="text-muted-foreground">لا توجد بيانات تقدم بعد.</p>}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>التسجيلات</CardTitle></CardHeader><CardContent>{enrollment.status !== "active" ? <p className="text-muted-foreground">تتاح التسجيلات بعد تفعيل التسجيل.</p> : !classroomId ? <p className="text-muted-foreground">لم يتم تعيين فصل بعد.</p> : recordingsQuery.isLoading ? <p>جاري تحميل التسجيلات...</p> : recordingsQuery.error ? <p className="text-destructive">{courseError(recordingsQuery.error)}</p> : !recordings.length ? <p className="text-muted-foreground">لا توجد تسجيلات حتى الآن.</p> : <div className="grid gap-3 md:grid-cols-2">{recordings.map((recording, index) => { const url = recording.localUrl || recording.recordingLink || recording.shareUrl; return <Button key={recording.sessionId || index} variant="outline" className="h-auto justify-start p-4" disabled={!url} onClick={() => url && (recording.shareUrl && !recording.localUrl ? window.open(recording.shareUrl, "_blank", "noopener,noreferrer") : setSelectedRecording({ sessionName: recording.sessionName, recordingLink: url }))}><Play className="me-2 h-4 w-4"/>{recording.sessionName || "تسجيل حصة"}</Button>; })}</div>}</CardContent></Card>
    <RecordingPlayerModal recording={selectedRecording} onClose={closeRecording}/>
  </div></DashboardLayout>;
}
