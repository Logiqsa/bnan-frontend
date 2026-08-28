import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getSchedule } from "@/api/scheduleApi";
import {
  classroomRecordingsApi,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import type { PortalLesson, RegistrationMode } from "@/api/types";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { usePortalAuth } from "./PortalAuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

const saturdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 1) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const recordingsFrom = (data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] }) =>
  Array.isArray(data) ? data : data.recordings || data.data || [];

export default function StudentSessions() {
  const { user } = usePortalAuth();
  const { isArabic, pick } = useLanguage();
  const [lessons, setLessons] = useState<PortalLesson[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const closeRecording = useCallback(() => setSelectedRecording(null), []);

  const classrooms = useMemo(() => Array.from(new Map(lessons.map((lesson) => [lesson.classroom.id, lesson.classroom])).values()), [lessons]);

  useEffect(() => {
    const modes: RegistrationMode[] = user?.registrationModes?.length
      ? user.registrationModes
      : [user?.registrationMode || "egyptian"];
    Promise.all(modes.map((mode) => getSchedule(mode, saturdayKey())))
      .then((groups) => {
        const unique = new Map<string, PortalLesson>();
        groups.flat().forEach((lesson) => unique.set(lesson.key, lesson));
        const result = [...unique.values()];
        setLessons(result);
        const firstClassroom = result[0]?.classroom.id || "";
        setClassroomId((current) => current || firstClassroom);
      })
      .catch((error) => toast.error((error as Error).message || pick("تعذر تحميل فصول الطالب", "Unable to load the student's classes")))
      .finally(() => setLoadingClassrooms(false));
  }, [pick, user?.registrationMode, user?.registrationModes]);

  const loadSessions = useCallback(async (id: string) => {
    setLoadingSessions(true);
    try {
      const recordingResponse = await classroomRecordingsApi.listRecordings(id);
      setRecordings(recordingsFrom(recordingResponse.data));
    } catch (error) {
      setRecordings([]);
      toast.error((error as Error).message || pick("تعذر تحميل التسجيلات", "Unable to load recordings"));
    } finally {
      setLoadingSessions(false);
    }
  }, [pick]);

  useEffect(() => {
    setRecordings([]);
    if (classroomId) void loadSessions(classroomId);
  }, [classroomId, loadSessions]);

  return <DashboardLayout><div className="mx-auto max-w-5xl" dir={isArabic ? "rtl" : "ltr"}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">{pick("تسجيلات الحصص", "Lesson recordings")}</h1><p className="mt-1 text-muted-foreground">{pick("تسجيلات حصص الفصول المسجل بها.", "Recordings from the classes you are enrolled in.")}</p></div><Button variant="outline" className="gap-2" disabled={!classroomId || loadingSessions} onClick={() => void loadSessions(classroomId)}><RefreshCw className={cn("h-4 w-4", loadingSessions && "animate-spin")}/>{pick("تحديث", "Refresh")}</Button></div>
    <Card className="mb-6"><CardContent className="p-5"><label className="space-y-2"><span className="text-sm font-medium">{pick("الفصل", "Class")}</span><Select value={classroomId} onValueChange={setClassroomId} disabled={loadingClassrooms || classrooms.length === 0}><SelectTrigger><SelectValue placeholder={loadingClassrooms ? pick("جاري التحميل...", "Loading...") : pick("اختر الفصل", "Select a class")}/></SelectTrigger><SelectContent>{classrooms.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label></CardContent></Card>
    {loadingClassrooms || loadingSessions ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full"/>)}</div>
      : !classroomId ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><CalendarDays className="mx-auto mb-3 h-9 w-9 opacity-40"/><p>{pick("لا توجد فصول مسجلة لهذا الطالب.", "No classes are registered for this student.")}</p></div></CardContent></Card>
      : recordings.length === 0 ? <Card><CardContent className="grid min-h-56 place-items-center text-muted-foreground">{pick("لا توجد تسجيلات حتى الآن.", "No recordings yet.")}</CardContent></Card>
      : <div className="grid gap-4 md:grid-cols-2">{recordings.map((recording, index) => {
        const name = recording.sessionName || pick("حصة بدون اسم", "Untitled lesson");
        const videoUrl = recording.recordingLink || recording.localUrl || recording.shareUrl;
        const open = () => {
          if (!videoUrl) return;
          if (recording.shareUrl && !recording.localUrl) return void window.open(recording.shareUrl, "_blank", "noopener,noreferrer");
          setSelectedRecording({ sessionName: name, recordingLink: recording.localUrl || videoUrl });
        };
        return <Card key={`${name}-${index}`} role={videoUrl ? "button" : undefined} tabIndex={videoUrl ? 0 : undefined} onClick={open} onKeyDown={(event) => { if (videoUrl && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(); } }} className={cn(videoUrl && "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}><CardContent className="p-5"><h2 className="font-bold">{name}</h2>{videoUrl && <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"><Play className="h-4 w-4"/>{pick("مشاهدة التسجيل", "Watch recording")}</div>}</CardContent></Card>;
      })}</div>}
    <RecordingPlayerModal recording={selectedRecording} onClose={closeRecording}/>
  </div></DashboardLayout>;
}
