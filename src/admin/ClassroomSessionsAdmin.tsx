import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronsUpDown, Play, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  classroomRecordingsApi,
  type ClassroomOption,
  type ClassroomSession,
  type ClassroomSubjectOption,
  type SessionRecording,
} from "@/api/classroomRecordingsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const statusLabelsAr: Record<string, string> = {
  live: "مباشرة",
  starting: "جاري البدء",
  completed: "مكتملة",
  ended: "منتهية",
  cancelled: "ملغاة",
  scheduled: "مجدولة",
  awaiting_zoom_end: "بانتظار انتهاء Zoom",
};
const statusLabelsEn: Record<string, string> = { live: "Live", starting: "Starting", completed: "Completed", ended: "Ended", cancelled: "Cancelled", scheduled: "Scheduled", awaiting_zoom_end: "Waiting for Zoom to end" };

const kindLabelsAr: Record<string, string> = {
  manual_recording: "تسجيل أرشيفي",
  live: "حصة مباشرة",
  scheduled: "حصة مجدولة",
};
const kindLabelsEn: Record<string, string> = { manual_recording: "Uploaded recording", live: "Live lesson", scheduled: "Scheduled lesson" };

const getSessions = (data: ClassroomSession[] | { sessions?: ClassroomSession[]; data?: ClassroomSession[] }) =>
  Array.isArray(data) ? data : data.sessions || data.data || [];

const getRecordings = (data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] }) =>
  Array.isArray(data) ? data : data.recordings || data.data || [];

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value.trim());
const normalizeSessionName = (value?: string) => (value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
const nestedName = (value: ClassroomSession["subject"] | ClassroomSession["teacher"]) => {
  if (typeof value === "string") return isObjectId(value) ? "" : value;
  return value?.name || (value && "fullName" in value ? value.fullName : "") || "";
};

export default function ClassroomSessionsAdmin() {
  const { isArabic, pick } = useLanguage();
  const [searchParams] = useSearchParams();
  const requestedClassroomId = searchParams.get("classroomId") || "";
  const requestedSessionId = searchParams.get("sessionId") || "";
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [subjects, setSubjects] = useState<ClassroomSubjectOption[]>([]);
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [curriculumId, setCurriculumId] = useState("all");
  const [classroomId, setClassroomId] = useState(requestedClassroomId);
  const [status, setStatus] = useState("all");
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState(requestedSessionId);
  const closeRecording = useCallback(() => setSelectedRecording(null), []);

  const curricula = useMemo(() => Array.from(new Map(
    classrooms.filter((item) => item.curriculum).map((item) => [item.curriculum!.id, item.curriculum!]),
  ).values()), [classrooms]);
  const filteredClassrooms = useMemo(() => classrooms.filter((item) =>
    (curriculumId === "all" || item.curriculum?.id === curriculumId)
  ), [classrooms, curriculumId]);
  const visibleSessions = useMemo(() => sessions
    .filter((item) => status === "all" || item.status === status)
    .sort((a, b) => new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime()), [sessions, status]);
  const statuses = useMemo(() => Array.from(new Set(sessions.map((item) => item.status).filter(Boolean))) as string[], [sessions]);
  const selectedClassroom = classrooms.find((item) => item.id === classroomId);

  useEffect(() => {
    classroomRecordingsApi.listClassrooms()
      .then((response) => setClassrooms(response.data || []))
      .catch((error) => toast.error((error as Error).message || pick("تعذر تحميل الفصول", "Unable to load classes")))
      .finally(() => setLoadingClassrooms(false));
  }, [pick]);

  const loadSessions = useCallback(async (id: string) => {
    setLoadingSessions(true);
    try {
      const [sessionsResponse, subjectsResponse, recordingsResponse] = await Promise.all([
        classroomRecordingsApi.listSessions(id),
        classroomRecordingsApi.listSubjects(id),
        classroomRecordingsApi.listRecordings(id),
      ]);
      setSessions(getSessions(sessionsResponse.data));
      setSubjects(subjectsResponse.data.subjects || []);
      setRecordings(getRecordings(recordingsResponse.data));
    } catch (error) {
      setSessions([]);
      setSubjects([]);
      setRecordings([]);
      toast.error((error as Error).message || pick("تعذر تحميل التسجيلات", "Unable to load recordings"));
    } finally {
      setLoadingSessions(false);
    }
  }, [pick]);

  useEffect(() => {
    setSessions([]);
    setSubjects([]);
    setRecordings([]);
    setStatus("all");
    if (classroomId) void loadSessions(classroomId);
  }, [classroomId, loadSessions]);

  useEffect(() => {
    if (!highlightedSessionId || loadingSessions || sessions.length === 0) return;
    const element = document.getElementById(`session-${highlightedSessionId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlightedSessionId(""), 5000);
    return () => window.clearTimeout(timer);
  }, [highlightedSessionId, loadingSessions, sessions]);

  const chooseCurriculum = (value: string) => {
    setCurriculumId(value);
    setClassroomId("");
  };

  return <DashboardLayout>
    <div className="mx-auto max-w-6xl" dir={isArabic ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">{pick("تسجيلات الفصل", "Class recordings")}</h1><p className="mt-1 text-muted-foreground">{pick("اعرض وفلتر كل الحصص الخاصة بالفصل.", "View and filter all lessons for a class.")}</p></div>
        <Button variant="outline" className="gap-2" disabled={!classroomId || loadingSessions} onClick={() => void loadSessions(classroomId)}><RefreshCw className={cn("h-4 w-4", loadingSessions && "animate-spin")} />{pick("تحديث", "Refresh")}</Button>
      </div>

      <Card className="mb-6"><CardContent className="grid gap-4 p-5 md:grid-cols-3">
        <div className="space-y-2"><Label>{pick("المنهج", "Curriculum")}</Label><Select value={curriculumId} onValueChange={chooseCurriculum} disabled={loadingClassrooms}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{pick("كل المناهج", "All curricula")}</SelectItem>{curricula.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{pick("الفصل", "Class")}</Label><Popover open={classroomOpen} onOpenChange={setClassroomOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" disabled={loadingClassrooms} className="w-full justify-between font-normal"><span className="truncate">{loadingClassrooms ? pick("جاري التحميل...", "Loading...") : selectedClassroom?.name || pick("اختر أو ابحث", "Select or search")}</span><ChevronsUpDown className="h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command dir={isArabic ? "rtl" : "ltr"}><CommandInput placeholder={pick("ابحث باسم الفصل...", "Search by class name...")}/><CommandList><CommandEmpty>{pick("لا توجد نتائج.", "No results found.")}</CommandEmpty><CommandGroup>{filteredClassrooms.map((item) => <CommandItem key={item.id} value={`${item.name} ${item.curriculum?.name || ""} ${item.grade?.name || ""}`} onSelect={() => { setClassroomId(item.id); setClassroomOpen(false); }}><Check className={cn("ml-2 h-4 w-4", classroomId === item.id ? "opacity-100" : "opacity-0")}/><span><span className="block">{item.name}</span><span className="text-xs text-muted-foreground">{[item.curriculum?.name, item.grade?.name].filter(Boolean).join(" — ")}</span></span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
        <div className="space-y-2"><Label>{pick("حالة السيشن", "Session status")}</Label><Select value={status} onValueChange={setStatus} disabled={!classroomId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{pick("كل الحالات", "All statuses")}</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{(isArabic ? statusLabelsAr : statusLabelsEn)[item] || item}</SelectItem>)}</SelectContent></Select></div>
      </CardContent></Card>

      {!classroomId ? <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground"><div><CalendarDays className="mx-auto mb-3 h-9 w-9 opacity-40"/><p>{pick("اختر فصلًا لعرض التسجيلات.", "Select a class to view its recordings.")}</p></div></CardContent></Card>
        : loadingSessions ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full" />)}</div>
        : visibleSessions.length === 0 ? <Card><CardContent className="grid min-h-56 place-items-center text-muted-foreground">{pick("لا توجد تسجيلات مطابقة.", "No matching recordings.")}</CardContent></Card>
        : <div className="grid gap-4 md:grid-cols-2">{visibleSessions.map((session, index) => {
          const sessionSubjectId = session.classroomSubjectId
            || (typeof session.classroomSubject === "string" ? session.classroomSubject : session.classroomSubject?.id);
          const subjectDetails = subjects.find((item) => item.classroomSubjectId === sessionSubjectId || item.id === sessionSubjectId);
          const populatedClassroomSubject = typeof session.classroomSubject === "object" ? session.classroomSubject : null;
          const subject = nestedName(session.subject)
            || populatedClassroomSubject?.subject?.name
            || populatedClassroomSubject?.name
            || subjectDetails?.name
            || subjectDetails?.subject?.name;
          const teacher = nestedName(session.teacher) || subjectDetails?.teacher?.name || "";
          const sessionId = session.id || session._id;
          const matchingRecording = recordings.find((item) =>
            (item.sessionId && item.sessionId === sessionId)
            || normalizeSessionName(item.sessionName) === normalizeSessionName(session.title || session.sessionName)
          );
          const recording = matchingRecording?.recordingLink
            || matchingRecording?.localUrl
            || matchingRecording?.shareUrl
            || session.recordingLink
            || session.recordingUrl;
          const sessionName = session.title || session.sessionName || pick("حصة بدون اسم", "Untitled lesson");
          const openRecording = () => {
            if (!recording) return;
            if (matchingRecording?.shareUrl && !matchingRecording.localUrl) {
              window.open(matchingRecording.shareUrl, "_blank", "noopener,noreferrer");
              return;
            }
            setSelectedRecording({ sessionName, recordingLink: matchingRecording?.localUrl || recording });
          };
          return <Card
            key={session.id || session._id || index}
            id={sessionId ? `session-${sessionId}` : undefined}
            role={recording ? "button" : undefined}
            tabIndex={recording ? 0 : undefined}
            aria-label={recording ? `مشاهدة تسجيل ${sessionName}` : undefined}
            onClick={openRecording}
            onKeyDown={(event) => {
              if (recording && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                openRecording();
              }
            }}
            className={cn(
              "transition-all duration-500",
              recording && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              highlightedSessionId && sessionId === highlightedSessionId && "border-primary bg-primary/10 ring-4 ring-primary/25 shadow-lg",
            )}
          ><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{sessionName}</h2>{subject && <p className="mt-1 text-sm text-muted-foreground">{subject}</p>}</div><Badge variant={session.status === "live" ? "default" : "secondary"}>{(isArabic ? statusLabelsAr : statusLabelsEn)[session.status || ""] || session.status || pick("غير محددة", "Unknown")}</Badge></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span>{session.startAt ? new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.startAt)) : pick("بدون موعد", "No date")}</span>{session.sessionKind && <span className="text-muted-foreground">{(isArabic ? kindLabelsAr : kindLabelsEn)[session.sessionKind] || session.sessionKind}</span>}{teacher && <span className="text-muted-foreground">{pick("المعلم:", "Teacher:")} {teacher}</span>}</div>{recording && <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"><Play className="h-4 w-4"/>{pick("اضغط لمشاهدة التسجيل", "Click to watch the recording")}</div>}</CardContent></Card>;
        })}</div>}
      <RecordingPlayerModal recording={selectedRecording} onClose={closeRecording} />
    </div>
  </DashboardLayout>;
}
