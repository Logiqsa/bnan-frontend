import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { ApiError } from "@/api/client";
import { getScheduleWeek, joinLesson } from "@/api/scheduleApi";
import { studentHomeApi, studentHomeQueryKey } from "@/api/studentHomeApi";
import type { PortalLesson } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StudentSessionSheet from "@/components/student/StudentSessionSheet";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";

const DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_NAMES: Record<string, [string, string]> = {
  saturday: ["السبت", "Saturday"], sunday: ["الأحد", "Sunday"], monday: ["الاثنين", "Monday"],
  tuesday: ["الثلاثاء", "Tuesday"], wednesday: ["الأربعاء", "Wednesday"], thursday: ["الخميس", "Thursday"], friday: ["الجمعة", "Friday"],
};
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const saturdayOf = (date: Date) => { const result = new Date(date); result.setHours(12, 0, 0, 0); result.setDate(result.getDate() - ((result.getDay() + 1) % 7)); return dateValue(result); };
const moveWeek = (value: string, amount: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount * 7); return dateValue(date); };
const displayDate = (value: string | undefined, locale: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "";

const joinError = (error: unknown, pick: (ar: string, en: string) => string) => {
  const apiError = error as ApiError;
  if (apiError.code === "SESSION_NOT_ACTIVE" || apiError.status === 404) return pick("الحصة ليست متاحة للدخول الآن.", "The lesson is not available to join now.");
  if (apiError.code === "CLASSROOM_ZOOM_NOT_CONFIGURED" || apiError.status === 409) return pick("رابط الحصة غير مُجهز حاليًا.", "The lesson link is not configured yet.");
  return apiError.message || pick("تعذر الدخول إلى الحصة.", "Unable to join the lesson.");
};

export default function StudentSchedule() {
  const { isArabic, pick } = useLanguage();
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const currentSaturday = useMemo(() => saturdayOf(new Date()), []);
  const [requestedWeek, setRequestedWeek] = useState(currentSaturday);
  const [joinMessage, setJoinMessage] = useState("");
  const [joiningClassroom, setJoiningClassroom] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<PortalLesson | null>(null);
  const homeQuery = useQuery({ queryKey: studentHomeQueryKey, queryFn: studentHomeApi.get });
  const mode = homeQuery.data?.student.curriculum?.registrationMode;
  const scheduleQuery = useQuery({
    queryKey: ["student-schedule", mode, requestedWeek],
    queryFn: () => getScheduleWeek(mode!, requestedWeek),
    enabled: mode === "egyptian" || mode === "gulf",
    placeholderData: (previous) => previous,
  });
  const joinMutation = useMutation({
    mutationFn: (classroomId: string) => joinLesson(classroomId),
    retry: false,
    onSuccess: (response) => {
      const meetingLink = response.data.meetingLink;
      if (!meetingLink) { setJoinMessage(pick("لم يرجع الخادم رابط دخول صالحًا.", "The server did not return a valid meeting link.")); return; }
      window.open(meetingLink, "_blank", "noopener,noreferrer");
    },
    onError: (error) => setJoinMessage(joinError(error, pick)),
    onSettled: () => setJoiningClassroom(""),
  });
  const week = scheduleQuery.data;
  const grouped = useMemo(() => {
    const groups = new Map<string, PortalLesson[]>(DAYS.map((day) => [day, []]));
    (week?.lessons || []).forEach((lesson) => groups.get(lesson.day)?.push(lesson));
    groups.forEach((lessons) => lessons.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return groups;
  }, [week?.lessons]);
  const isCurrentWeek = week?.weekStart === week?.currentWeekStart || week?.weekStart === currentSaturday;

  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-5" dir={isArabic ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold sm:text-3xl">{pick("جدول الحصص", "Lesson schedule")}</h1><p className="mt-1 text-sm text-muted-foreground">{pick("مواعيد حصصك الأسبوعية وحالة الجلسة المباشرة.", "Your weekly lessons and live-session status.")}</p></div>
      <Button variant="outline" onClick={() => void scheduleQuery.refetch()} disabled={!mode || scheduleQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${scheduleQuery.isFetching ? "animate-spin" : ""}`} />{pick("تحديث", "Refresh")}</Button>
    </header>
    <Card><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" size="sm" onClick={() => setRequestedWeek((value) => moveWeek(value, -1))}><ChevronRight className="me-1 h-4 w-4" />{pick("الأسبوع السابق", "Previous week")}</Button>
      <div className="min-w-0 text-center"><div className="flex flex-wrap items-center justify-center gap-2"><p className="font-semibold">{week ? `${displayDate(week.weekStart, locale)} — ${displayDate(week.weekEnd, locale)}` : pick("جاري تحميل الأسبوع...", "Loading week...")}</p>{isCurrentWeek && <Badge>{pick("هذا الأسبوع", "Current week")}</Badge>}</div>{week?.timezone && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{week.timezone}</p>}</div>
      <div className="flex gap-2"><Button variant="ghost" size="sm" disabled={requestedWeek === currentSaturday} onClick={() => setRequestedWeek(currentSaturday)}>{pick("هذا الأسبوع", "This week")}</Button><Button variant="outline" size="sm" onClick={() => setRequestedWeek((value) => moveWeek(value, 1))}>{pick("الأسبوع التالي", "Next week")}<ChevronLeft className="ms-1 h-4 w-4" /></Button></div>
    </div></CardContent></Card>
    {homeQuery.isLoading || (scheduleQuery.isLoading && !week) ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-44 w-full" />)}</div>
      : homeQuery.error ? <Card><CardContent className="grid min-h-52 place-items-center gap-3 p-6 text-center"><p className="text-destructive">{pick("تعذر تحديد نظام الطالب.", "Unable to determine the student system.")}</p><Button onClick={() => void homeQuery.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : !mode ? <Card><CardContent className="p-8 text-center text-destructive">{pick("نظام تسجيل الطالب غير متاح.", "Student registration mode is unavailable.")}</CardContent></Card>
      : scheduleQuery.error ? <Card><CardContent className="grid min-h-52 place-items-center gap-3 p-6 text-center"><p className="text-destructive">{(scheduleQuery.error as Error).message || pick("تعذر تحميل الجدول.", "Unable to load the schedule.")}</p><Button onClick={() => void scheduleQuery.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
      : <section className={`grid gap-4 ${scheduleQuery.isFetching ? "opacity-70" : ""} md:grid-cols-2 xl:grid-cols-3`} aria-busy={scheduleQuery.isFetching}>
        {DAYS.map((day) => { const lessons = grouped.get(day) || []; return <Card key={day} className="min-w-0"><CardHeader className="pb-3"><CardTitle className="flex items-center justify-between gap-2 text-lg"><span className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{pick(...DAY_NAMES[day])}</span><Badge variant="secondary">{lessons.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{lessons.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{pick("لا توجد حصص", "No lessons")}</p> : lessons.map((lesson) => <article key={lesson.key} role="button" tabIndex={0} aria-label={`${pick("فتح تفاصيل", "Open details")} ${lesson.subject.name}`} onClick={() => { setJoinMessage(""); setSelectedLesson(lesson); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setJoinMessage(""); setSelectedLesson(lesson); } }} className="min-w-0 cursor-pointer rounded-xl border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-semibold">{lesson.subject.name}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{lesson.classroom.name}</p></div><span className="shrink-0 text-sm font-semibold text-primary" dir="ltr">{lesson.startTime}{lesson.endTime ? ` – ${lesson.endTime}` : ""}</span></div>{lesson.date && <p className="mt-2 text-xs text-muted-foreground">{displayDate(lesson.date, locale)}</p>}{lesson.teacher && <p className="mt-2 break-words text-sm">{pick("المعلم:", "Teacher:")} {lesson.teacher.name || lesson.teacher.fullName || pick("غير متاح", "Unavailable")}</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2">{lesson.activeSession?.status && <Badge variant={lesson.activeSession.canJoin ? "default" : "outline"}>{lesson.activeSession.status}</Badge>}{lesson.activeSession?.canJoin === true && <Button size="sm" disabled={joinMutation.isPending} onClick={(event) => { event.stopPropagation(); setJoinMessage(""); setJoiningClassroom(lesson.classroom.id); joinMutation.mutate(lesson.classroom.id); }}><ExternalLink className="me-1 h-4 w-4" />{joinMutation.isPending && joiningClassroom === lesson.classroom.id ? pick("جاري الدخول...", "Joining...") : pick("دخول الحصة", "Join lesson")}</Button>}</div></article>)}</CardContent></Card>; })}
      </section>}
    {joinMessage && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{joinMessage}</p>}
    <StudentSessionSheet
      lesson={selectedLesson}
      open={Boolean(selectedLesson)}
      onOpenChange={(open) => { if (!open) { setSelectedLesson(null); setJoinMessage(""); } }}
      onJoin={(lesson) => { setJoinMessage(""); setJoiningClassroom(lesson.classroom.id); joinMutation.mutate(lesson.classroom.id); }}
      joining={joinMutation.isPending && joiningClassroom === selectedLesson?.classroom.id}
      joinError={joinMessage}
    />
  </main></DashboardLayout>;
}
