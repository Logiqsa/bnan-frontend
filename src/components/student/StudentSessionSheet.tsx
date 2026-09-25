import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ExternalLink, FileText, LogIn, Video } from "lucide-react";
import { studentSessionReportApi } from "@/api/studentSessionReportApi";
import type { PortalLesson } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";

interface StudentSessionSheetProps {
  lesson: PortalLesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (lesson: PortalLesson) => void;
  joining: boolean;
  joinError?: string;
}

const sessionIdOf = (lesson: PortalLesson | null) =>
  lesson?.activeSession?.sessionId ?? lesson?.activeSession?.id;

export default function StudentSessionSheet({
  lesson,
  open,
  onOpenChange,
  onJoin,
  joining,
  joinError,
}: StudentSessionSheetProps) {
  const { isArabic, pick } = useLanguage();
  const [reportRequested, setReportRequested] = useState(false);
  const sessionId = sessionIdOf(lesson);
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const reportQuery = useQuery({
    queryKey: ["student-session-report", sessionId],
    queryFn: () => studentSessionReportApi.getReport(sessionId!),
    enabled: open && reportRequested && Boolean(sessionId),
    retry: false,
  });

  useEffect(() => {
    setReportRequested(false);
  }, [lesson?.key]);

  if (!lesson) return null;

  const report = reportQuery.data?.data;
  const summary = report?.summary;
  const dateLabel = lesson.date
    ? new Date(`${lesson.date}T12:00:00`).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isArabic ? "right" : "left"}
        className="w-full max-w-full overflow-y-auto sm:max-w-md"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <SheetHeader className="pe-8 text-start">
          <SheetTitle className="break-words">{lesson.subject.name}</SheetTitle>
          <SheetDescription className="break-words">{lesson.classroom.name}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold">{pick("معلومات الحصة", "Session information")}</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {dateLabel && <div><dt className="text-muted-foreground">{pick("التاريخ", "Date")}</dt><dd className="mt-1 font-medium">{dateLabel}</dd></div>}
              <div><dt className="text-muted-foreground">{pick("الوقت", "Time")}</dt><dd className="mt-1 font-medium" dir="ltr">{lesson.startTime}{lesson.endTime ? ` – ${lesson.endTime}` : ""}</dd></div>
              {lesson.teacher && <div><dt className="text-muted-foreground">{pick("المعلم", "Teacher")}</dt><dd className="mt-1 break-words font-medium">{lesson.teacher.name || lesson.teacher.fullName}</dd></div>}
              {lesson.activeSession?.status && <div><dt className="text-muted-foreground">{pick("الحالة", "Status")}</dt><dd className="mt-1"><Badge variant={lesson.activeSession.canJoin ? "default" : "outline"}>{lesson.activeSession.status}</Badge></dd></div>}
            </dl>
          </section>

          {lesson.activeSession?.canJoin === true && (
            <Button className="w-full" disabled={joining} onClick={() => onJoin(lesson)}>
              <LogIn className="me-2 h-4 w-4" />
              {joining ? pick("جاري الدخول...", "Joining...") : pick("دخول الحصة", "Join lesson")}
            </Button>
          )}
          {joinError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{joinError}</p>}

          {lesson.activeSession?.recordingUrl && (
            <section className="rounded-xl border p-4">
              <h3 className="flex items-center gap-2 font-semibold"><Video className="h-4 w-4 text-primary" />{pick("تسجيل الحصة", "Session recording")}</h3>
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href={lesson.activeSession.recordingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="me-2 h-4 w-4" />{pick("فتح التسجيل", "Open recording")}</a>
              </Button>
            </section>
          )}

          {lesson.activeSession?.summaryUrl && (
            <section className="rounded-xl border p-4">
              <h3 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" />{pick("ملخص الحصة", "Session summary")}</h3>
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href={lesson.activeSession.summaryUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="me-2 h-4 w-4" />{pick("فتح الملخص", "Open summary")}</a>
              </Button>
            </section>
          )}

          {sessionId && (
            <section className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-primary" />{pick("تقرير الحصة", "Session report")}</h3>
                {!reportRequested && <Button size="sm" variant="outline" onClick={() => setReportRequested(true)}>{pick("عرض التقرير", "View report")}</Button>}
              </div>
              {reportRequested && reportQuery.isLoading && <div className="mt-4 space-y-2" aria-label={pick("جاري تحميل التقرير...", "Loading report...")}><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
              {reportRequested && reportQuery.isError && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><p>{pick("تعذر تحميل تقرير الحصة.", "Unable to load the session report.")}</p><Button className="mt-2" size="sm" variant="outline" onClick={() => void reportQuery.refetch()}>{pick("إعادة المحاولة", "Retry")}</Button></div>}
              {reportRequested && report && !reportQuery.isError && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">{pick("هذه بيانات تقرير الجلسة وليست سجل حضور للطالب.", "These are session report metrics, not student attendance.")}</p>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {(summary?.status || report.status) && <div className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground">{pick("حالة التقرير", "Report status")}</dt><dd className="mt-1 font-medium">{summary?.status || report.status}</dd></div>}
                    {typeof summary?.durationMinutes === "number" && <div className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground">{pick("مدة الجلسة", "Session duration")}</dt><dd className="mt-1 font-medium">{summary.durationMinutes} {pick("دقيقة", "minutes")}</dd></div>}
                    {typeof summary?.participantRows === "number" && <div className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground">{pick("سجلات مشاركي Zoom", "Zoom participant records")}</dt><dd className="mt-1 font-medium">{summary.participantRows}</dd></div>}
                    {typeof summary?.uniqueParticipants === "number" && <div className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground">{pick("مشاركو Zoom الفريدون", "Unique Zoom participants")}</dt><dd className="mt-1 font-medium">{summary.uniqueParticipants}</dd></div>}
                    {summary?.processedAt && <div className="rounded-lg bg-muted p-3 sm:col-span-2"><dt className="text-muted-foreground">{pick("وقت تجهيز التقرير", "Report processed at")}</dt><dd className="mt-1 font-medium">{new Date(summary.processedAt).toLocaleString(locale)}</dd></div>}
                  </dl>
                  {!summary && !report.status && <p className="mt-3 text-sm text-muted-foreground">{pick("التقرير غير جاهز حاليًا.", "The report is not ready yet.")}</p>}
                </div>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
