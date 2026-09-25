import { useCallback, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Play, RefreshCw } from "lucide-react";
import { classroomRecordingsApi, type SessionRecording } from "@/api/classroomRecordingsApi";
import { coursesApi } from "@/api/coursesApi";
import { studentClassroomsApi } from "@/api/studentClassroomsApi";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";

interface StudentClassroom { id: string; name: string }
const idOf = (value: unknown) => typeof value === "string" ? value : typeof value === "object" && value ? String((value as { id?: string; _id?: string }).id || (value as { _id?: string })._id || "") : "";
const nameOf = (value: unknown) => typeof value === "object" && value && "name" in value ? String((value as { name?: string }).name || "") : "";
const recordingsFrom = (data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] }) => Array.isArray(data) ? data : data.recordings || data.data || [];

export default function StudentSessions() {
  const { isArabic, pick } = useLanguage();
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const closeRecording = useCallback(() => setSelectedRecording(null), []);
  const regularQuery = useQuery({ queryKey: ["student-classroom-enrollments"], queryFn: studentClassroomsApi.myEnrollments });
  const courseQuery = useQuery({ queryKey: ["my-course-enrollments"], queryFn: coursesApi.myEnrollments });
  const classrooms = useMemo(() => {
    const values = new Map<string, StudentClassroom>();
    (regularQuery.data || []).filter((item) => item.status === "approved").forEach((item) => {
      const id = idOf(item.classroom);
      if (id) values.set(id, { id, name: nameOf(item.classroom) });
    });
    (courseQuery.data || []).filter((item) => item.status === "active").forEach((item) => {
      const group = typeof item.group === "object" ? item.group : null;
      const classroom = item.classroom || group?.classroom;
      const id = idOf(classroom);
      if (id && !values.has(id)) values.set(id, { id, name: nameOf(classroom) || nameOf(group) });
    });
    return [...values.values()];
  }, [courseQuery.data, regularQuery.data]);
  const recordingQueries = useQueries({ queries: classrooms.map((classroom) => ({
    queryKey: ["student-classroom-recordings", classroom.id],
    queryFn: async () => recordingsFrom((await classroomRecordingsApi.listRecordings(classroom.id)).data),
    retry: false,
  })) });
  const sourcesLoading = regularQuery.isLoading || courseQuery.isLoading;
  const sourceError = regularQuery.error || courseQuery.error;
  const recordingsLoading = recordingQueries.some((query) => query.isLoading);
  const failedCount = recordingQueries.filter((query) => query.isError).length;
  const successfulCount = recordingQueries.filter((query) => query.isSuccess).length;
  const totalRecordings = recordingQueries.reduce((total, query) => total + (query.data?.length || 0), 0);
  const retry = () => {
    void regularQuery.refetch();
    void courseQuery.refetch();
    recordingQueries.forEach((query) => { if (query.isError) void query.refetch(); });
  };

  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-5" dir={isArabic ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold sm:text-3xl">{pick("تسجيلات الحصص", "Lesson recordings")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("التسجيلات الجاهزة من الفصول المسجل بها.", "Ready recordings from your enrolled classrooms.")}</p></div><Button variant="outline" onClick={retry} disabled={sourcesLoading || recordingsLoading}><RefreshCw className={`me-2 h-4 w-4 ${(sourcesLoading || recordingsLoading) ? "animate-spin" : ""}`} />{pick("تحديث", "Refresh")}</Button></header>
    {sourcesLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-36 w-full" />)}</div>
      : sourceError ? <Card><CardContent className="grid min-h-52 place-items-center gap-3 p-6 text-center"><p className="text-destructive">{pick("تعذر تحميل فصول الطالب.", "Unable to load student classrooms.")}</p><Button onClick={retry}>{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : classrooms.length === 0 ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><CalendarDays className="mx-auto mb-3 h-9 w-9 opacity-40" /><p>{pick("لا توجد فصول مسجلة لهذا الطالب.", "No classrooms are registered for this student.")}</p></div></CardContent></Card>
      : <>{failedCount > 0 && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{successfulCount > 0 ? pick("تعذر تحميل تسجيلات بعض الفصول، وتظهر النتائج المتاحة فقط.", "Some classroom recordings could not be loaded; available results are shown.") : pick("تعذر تحميل التسجيلات.", "Unable to load recordings.")}</span><Button size="sm" variant="outline" onClick={retry}>{pick("إعادة المحاولة", "Retry")}</Button></div>}
        {recordingsLoading && totalRecordings === 0 ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-36 w-full" />)}</div>
          : totalRecordings === 0 && failedCount < classrooms.length ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground">{pick("لا توجد تسجيلات جاهزة حتى الآن.", "No ready recordings yet.")}</CardContent></Card>
          : <div className="space-y-5">{classrooms.map((classroom, classroomIndex) => {
            const recordings = recordingQueries[classroomIndex].data || [];
            if (!recordings.length) return null;
            return <section key={classroom.id}><h2 className="mb-3 break-words text-lg font-semibold">{classroom.name || pick("فصل", "Classroom")}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recordings.map((recording, recordingIndex) => {
              const playable = Boolean(recording.recordingLink);
              return <Card key={`${classroom.id}-recording-${recordingIndex}`} className="min-w-0"><CardHeader className="pb-3"><CardTitle className="break-words text-base">{recording.sessionName}</CardTitle></CardHeader><CardContent>{playable ? <Button variant="outline" className="w-full" onClick={() => setSelectedRecording({ sessionName: recording.sessionName, recordingLink: recording.recordingLink })}><Play className="me-2 h-4 w-4" />{pick("مشاهدة التسجيل", "Watch recording")}</Button> : <p className="text-sm text-muted-foreground">{pick("التسجيل غير متاح للتشغيل.", "Recording is unavailable for playback.")}</p>}</CardContent></Card>;
            })}</div></section>;
          })}</div>}
      </>}
    <RecordingPlayerModal recording={selectedRecording} onClose={closeRecording} />
  </main></DashboardLayout>;
}
