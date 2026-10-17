import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Play,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import { classroomRecordingsApi, type ClassroomSession } from "@/api/classroomRecordingsApi";
import { ApiError } from "@/api/client";
import { teacherSessionReportApi } from "@/api/teacherSessionReportApi";
import { getTeacherSessionEntry } from "@/api/scheduleApi";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import TeacherSessionAttendance from "./TeacherSessionAttendance";
import { closeReservedZoomWindow, navigateReservedZoomWindow, reserveZoomWindow } from "@/lib/zoomWindow";

const objectName = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name : undefined;
};

const objectId = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const reference = value as { id?: unknown; _id?: unknown };
  const id = reference.id || reference._id;
  return typeof id === "string" && id ? id : undefined;
};

const sessionClassroomName = (session: ClassroomSession) => {
  const direct = objectName(session.classroom);
  if (direct) return direct;
  return typeof session.classroomSubject === "object"
    ? objectName(session.classroomSubject?.classroom)
    : undefined;
};

const sessionSubjectName = (session: ClassroomSession) => {
  const direct = objectName(session.subject);
  if (direct) return direct;
  return typeof session.classroomSubject === "object"
    ? objectName(session.classroomSubject?.subject)
    : undefined;
};

const sessionGroup = (session: ClassroomSession) =>
  typeof session.courseGroup === "object" ? session.courseGroup : null;

export default function TeacherSessionDetails() {
  const { classroomId = "", sessionId = "" } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const { language, pick } = useLanguage();
  const isAdmin = useLocation().pathname.startsWith("/admin/");
  const [reportPage, setReportPage] = useState(1);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [openingZoom, setOpeningZoom] = useState(false);
  const openingZoomRef = useRef(false);
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const closeRecording = useCallback(() => setSelectedRecording(null), []);

  useEffect(() => setReportPage(1), [sessionId]);

  const sessionQuery = useQuery({
    queryKey: ["teacher-session-details", sessionId],
    queryFn: async () => (await classroomRecordingsApi.getSession(sessionId)).data,
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const session = sessionQuery.data;
  const populatedClassroom = session && typeof session.classroomSubject === "object"
    ? session.classroomSubject?.classroom
    : undefined;
  const actualClassroomId = session
    ? objectId(session.classroom) || objectId(populatedClassroom)
    : undefined;
  const classroomMismatch = Boolean(
    actualClassroomId && classroomId && actualClassroomId !== classroomId,
  );
  const resolvedClassroomId = actualClassroomId || classroomId;
  const reportQuery = useQuery({
    queryKey: ["teacher-session-report", sessionId, reportPage],
    queryFn: () => teacherSessionReportApi.getReport(sessionId, reportPage, 50),
    enabled: Boolean(sessionId) && sessionQuery.isSuccess && !classroomMismatch,
    staleTime: 30_000,
    retry: 1,
  });

  const report = reportQuery.data?.data;
  const pagination = reportQuery.data?.pagination;
  const group = session ? sessionGroup(session) : null;
  const courseName = group && typeof group.course === "object" ? objectName(group.course) : undefined;
  const summaryNextSteps = Array.isArray(session?.summary?.nextSteps)
    ? session.summary.nextSteps
      .filter((step): step is string => typeof step === "string" && Boolean(step.trim()))
      .map((step) => step.trim())
    : [];
  const hasSummaryDetails = Boolean(
    session?.summary?.content || session?.summary?.docUrl || summaryNextSteps.length,
  );

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const formatDuration = (seconds?: number | null) => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
    const rounded = Math.round(seconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const remainingSeconds = rounded % 60;
    const parts: string[] = [];
    if (hours) parts.push(pick(`${hours} ${hours === 1 ? "ساعة" : "ساعات"}`, `${hours} ${hours === 1 ? "hour" : "hours"}`));
    if (minutes) parts.push(pick(`${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`, `${minutes} ${minutes === 1 ? "minute" : "minutes"}`));
    if (remainingSeconds || !parts.length) parts.push(pick(`${remainingSeconds} ${remainingSeconds === 1 ? "ثانية" : "ثوانٍ"}`, `${remainingSeconds} ${remainingSeconds === 1 ? "second" : "seconds"}`));
    return parts.join(pick(" و", " and "));
  };
  const sessionStatusLabel = (status?: string) => {
    const labels: Record<string, [string, string]> = {
      scheduled: ["مجدولة", "Scheduled"],
      starting: ["يتم بدء الحصة", "Starting now"],
      live: ["مباشرة الآن", "Live now"],
      awaiting_zoom_end: ["في انتظار تأكيد الانتهاء", "Awaiting end confirmation"],
      ended: ["انتهت", "Ended"],
      completed: ["انتهت", "Completed"],
      cancelled: ["ملغاة", "Cancelled"],
    };
    const label = status ? labels[status.toLowerCase()] : undefined;
    return label ? pick(...label) : status;
  };
  const processingStatusLabel = (status?: string) => {
    const labels: Record<string, [string, string]> = {
      pending: ["قيد الانتظار", "Pending"],
      processing: ["قيد المعالجة", "Processing"],
      queued: ["في قائمة المعالجة", "Queued"],
      completed: ["مكتمل", "Completed"],
      ready: ["جاهز", "Ready"],
      failed: ["فشل", "Failed"],
      unavailable: ["غير متاح", "Unavailable"],
    };
    const label = status ? labels[status.toLowerCase()] : undefined;
    return label ? pick(...label) : status;
  };

  const backPath = isAdmin
    ? `/admin/classrooms/${encodeURIComponent(classroomId)}?tab=sessions`
    : classroomMismatch
      ? "/portal/teacher/classrooms"
      : `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}`;
  const notFound = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 404;
  const sessionRecordId = session ? objectId(session) : undefined;
  const canOpenTeacherEntry = !isAdmin && Boolean(resolvedClassroomId && sessionRecordId && ["starting", "live"].includes(session.status || ""));
  const openTeacherEntry = async () => {
    if (!resolvedClassroomId || !sessionRecordId || openingZoomRef.current) return;
    openingZoomRef.current = true;
    setOpeningZoom(true);
    const popup = reserveZoomWindow();
    try {
      const result = await getTeacherSessionEntry(resolvedClassroomId, sessionRecordId);
      if (!navigateReservedZoomWindow(popup, result.data.teacherStartUrl)) {
        throw new Error("POPUP_BLOCKED");
      }
    } catch (error) {
      closeReservedZoomWindow(popup);
      const apiError = error as ApiError;
      const message = apiError.code === "SESSION_NOT_ACTIVE"
        ? pick("لم تعد هذه الحصة نشطة. حدّث الصفحة.", "This session is no longer active. Refresh the page.")
        : apiError.code === "TEACHER_START_URL_UNAVAILABLE"
          ? pick("تعذر تجهيز رابط المضيف حاليًا. حاول مرة أخرى.", "The host link is unavailable right now. Please try again.")
          : apiError.message || pick("تعذر فتح رابط Zoom. تحقق من السماح بالنوافذ المنبثقة.", "Unable to open Zoom. Check your popup permissions.");
      window.alert(message);
    } finally {
      openingZoomRef.current = false;
      setOpeningZoom(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden">
        <Button asChild variant="outline">
          <Link to={backPath}><ArrowRight className="me-2 h-4 w-4" />{classroomMismatch ? pick("العودة إلى الفصول", "Back to classrooms") : pick("العودة لجلسات الفصل", "Back to classroom sessions")}</Link>
        </Button>

        {sessionQuery.isPending ? (
          <div className="space-y-5" aria-label={pick("جاري تحميل تفاصيل الجلسة", "Loading session details")}>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : sessionQuery.isError || !session ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
              <h1 className="text-xl font-bold">{notFound ? pick("الجلسة غير موجودة", "Session not found") : pick("تعذر تحميل تفاصيل الجلسة", "Unable to load session details")}</h1>
              <p className="text-sm text-muted-foreground">{notFound ? pick("قد تكون الجلسة حُذفت أو لم تعد متاحة.", "The session may have been removed or is no longer available.") : pick("حاول تحميل الصفحة مرة أخرى.", "Try loading the page again.")}</p>
              {!notFound && <Button variant="outline" onClick={() => void sessionQuery.refetch()} disabled={sessionQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${sessionQuery.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button>}
            </CardContent>
          </Card>
        ) : classroomMismatch ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
              <h1 className="text-xl font-bold">{pick("الجلسة لا تنتمي إلى هذا الفصل", "This session does not belong to this classroom")}</h1>
              <p className="text-sm text-muted-foreground">{pick("ارجع إلى قائمة الفصول واختر الجلسة من فصلها الصحيح.", "Return to the classrooms list and open the session from its correct classroom.")}</p>
              <Button asChild><Link to="/portal/teacher/classrooms">{pick("العودة إلى الفصول", "Back to classrooms")}</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{session.title || session.sessionName || pick("تفاصيل الجلسة", "Session details")}</h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {session.status && <Badge variant="secondary">{sessionStatusLabel(session.status)}</Badge>}
                  </div>
                </div>
                {canOpenTeacherEntry && (
                  <Button type="button" className="shrink-0" disabled={openingZoom} onClick={() => void openTeacherEntry()}>
                    {openingZoom ? <RefreshCw className="me-2 h-4 w-4 animate-spin" /> : <ExternalLink className="me-2 h-4 w-4" />}
                    {openingZoom ? pick("جاري فتح Zoom...", "Opening Zoom...") : pick("فتح Zoom كمعلم", "Open Zoom as teacher")}
                  </Button>
                )}
              </div>
            </header>

            <Card>
              <CardHeader><CardTitle>{pick("بيانات الجلسة", "Session information")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                {sessionSubjectName(session) && <Info label={pick("المادة", "Subject")} value={sessionSubjectName(session)!} />}
                {sessionClassroomName(session) && <Info label={pick("الفصل", "Classroom")} value={sessionClassroomName(session)!} />}
                {objectName(group) && <Info label={pick("المجموعة", "Group")} value={objectName(group)!} />}
                {courseName && <Info label={pick("الدورة", "Course")} value={courseName} />}
                {formatDate(session.scheduledStartAt || session.startAt) && <Info label={pick("الموعد", "Scheduled")} value={formatDate(session.scheduledStartAt || session.startAt)!} icon={<CalendarDays className="h-4 w-4" />} />}
                {formatDate(session.actualStartedAt) && <Info label={pick("بدأت فعليًا", "Actually started")} value={formatDate(session.actualStartedAt)!} icon={<Clock3 className="h-4 w-4" />} />}
                {formatDate(session.actualEndedAt || session.endAt) && <Info label={pick("انتهت", "Ended")} value={formatDate(session.actualEndedAt || session.endAt)!} icon={<Clock3 className="h-4 w-4" />} />}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <TeacherSessionAttendance sessionId={sessionId} classroomId={resolvedClassroomId} readOnly={false} embedded />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{pick("تقرير الجلسة ومشاركو Zoom", "Session report and Zoom participants")}</CardTitle>
              </CardHeader>
              <CardContent>
                {reportQuery.isPending ? (
                  <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
                ) : reportQuery.isError ? (
                  <div className="space-y-3 rounded-lg border border-destructive/30 p-4 text-sm"><p>{pick("تعذر تحميل تقرير الجلسة.", "Unable to load the session report.")}</p><Button variant="outline" onClick={() => void reportQuery.refetch()} disabled={reportQuery.isFetching}>{pick("إعادة المحاولة", "Retry")}</Button></div>
                ) : report ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {report.status && <Badge variant="secondary">{pick("الحالة", "Status")}: {processingStatusLabel(report.status)}</Badge>}
                      {typeof report.summary?.uniqueParticipants === "number" && <Badge variant="outline">{pick("المشاركون", "Participants")}: {report.summary.uniqueParticipants}</Badge>}
                      {formatDuration(report.summary?.meetingDurationSeconds) && <Badge variant="outline">{pick("مدة لقاء Zoom", "Zoom meeting duration")}: {formatDuration(report.summary?.meetingDurationSeconds)}</Badge>}
                      {typeof report.summary?.durationMinutes === "number" && <Badge variant="outline" className="inline-flex items-center gap-1">{pick("مدة الحصة التعليمية", "Instructional duration")}: {formatDuration(report.summary.durationMinutes * 60)}<Tooltip><TooltipTrigger asChild><button type="button" className="rounded-full text-muted-foreground hover:text-foreground" aria-label={pick("توضيح مدة الحصة التعليمية", "Explain instructional duration")}><CircleAlert className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-72 leading-6">{report.summary.uniqueParticipants === 1 ? pick("تُحسب من وقت دخول الطالب الموثّق حتى نهاية الجلسة. لا تمثل مدة ملف التسجيل.", "Calculated from the verified student's entry until session end; it is not the recording length.") : pick("تُحسب من وقت دخول أول طالب موثّق حتى نهاية الجلسة. لا تمثل مدة ملف التسجيل.", "Calculated from the first verified student entry until session end; it is not the recording length.")}</TooltipContent></Tooltip></Badge>}
                    </div>
                    {report.participants.length === 0 ? (
                      <p className="rounded-lg bg-muted/40 p-5 text-center text-sm text-muted-foreground">{pick("لا توجد بيانات مشاركين متاحة.", "No participant data is available.")}</p>
                    ) : (
                      <details className="rounded-lg border" open>
                        <summary className="cursor-pointer px-4 py-3 font-medium">{pick("عرض المشاركين", "View participants")} ({pagination?.total ?? report.participants.length})</summary>
                        <div className="space-y-3 border-t p-3 sm:p-4">
                          {report.participants.map((participant, index) => (
                            <div key={participant.key || `${participant.email || participant.name || "participant"}-${index}`} className="min-w-0 rounded-xl border bg-muted/30 p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words font-medium">{participant.name || pick("مشارك", "Participant")}</p><div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{pick("إجمالي المشاركة", "Total participation")}: {formatDuration(participant.totalDurationSeconds ?? participant.durationSeconds) || pick("0 ثوانٍ", "0 seconds")}</Badge>{typeof participant.visitCount === "number" && <Badge variant="outline">{pick(`دخل ${participant.visitCount} ${participant.visitCount === 1 ? "مرة" : "مرات"}`, `${participant.visitCount} join${participant.visitCount === 1 ? "" : "s"}`)}</Badge>}</div></div>
                              {participant.email && <p className="mt-1 break-all text-xs text-muted-foreground">{participant.email}</p>}
                              <div className="mt-3 space-y-2 border-t pt-2 text-xs text-muted-foreground">
                                {(participant.visits?.length ? participant.visits : [{ joinedAt: participant.joinTime, leftAt: participant.leaveTime, durationSeconds: participant.durationSeconds }]).map((visit, visitIndex) => <div key={`${visit.joinedAt || "unknown"}-${visitIndex}`} className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="font-medium text-foreground/80">{pick(`الدخول ${visitIndex + 1}`, `Join ${visitIndex + 1}`)}</span>{formatDate(visit.joinedAt) && <span>{pick("من", "From")}: {formatDate(visit.joinedAt)}</span>}{formatDate(visit.leftAt) && <span>{pick("إلى", "To")}: {formatDate(visit.leftAt)}</span>}<span>{pick("المدة", "Duration")}: {formatDuration(visit.durationSeconds) || pick("0 ثوانٍ", "0 seconds")}</span></div>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {pagination && pagination.lastPage > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <Button variant="outline" size="sm" disabled={reportPage <= 1 || reportQuery.isFetching} onClick={() => setReportPage((page) => Math.max(1, page - 1))}>{pick("السابق", "Previous")}</Button>
                        <span className="text-xs text-muted-foreground">{pick(`صفحة ${pagination.currentPage} من ${pagination.lastPage}`, `Page ${pagination.currentPage} of ${pagination.lastPage}`)}</span>
                        <Button variant="outline" size="sm" disabled={reportPage >= pagination.lastPage || reportQuery.isFetching} onClick={() => setReportPage((page) => page + 1)}>{pick("التالي", "Next")}</Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-[#0d2048] via-[#102a5d] to-[#06152f] text-white shadow-lg">
                <CardHeader className="border-b border-white/10 bg-white/5"><CardTitle className="flex items-center gap-2 text-white"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-300/15 text-sky-200"><Video className="h-5 w-5" /></span>{pick("تسجيل الحصة", "Session recording")}</CardTitle></CardHeader>
                <CardContent className="pt-5">
                  {session.recording?.localUrl || session.recording?.shareUrl ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-1">{session.recording?.status && <Badge className="border-0 bg-sky-300 text-[#08204a] hover:bg-sky-200">{processingStatusLabel(session.recording.status)}</Badge>}<p className="text-sm text-slate-200">{pick("التسجيل جاهز للمشاهدة داخل المنصة.", "The recording is ready to watch in Bnan.")}</p></div><Button className="w-full bg-white text-[#0b2454] hover:bg-sky-100 sm:w-auto" onClick={() => setSelectedRecording({
                      sessionName: session.title || session.sessionName || pick("تسجيل الحصة", "Session recording"),
                      recordingLink: session.recording?.localUrl || session.recording?.shareUrl || "",
                    })}><Play className="me-2 h-4 w-4" />{pick("مشاهدة التسجيل", "Watch recording")}</Button></div>
                  ) : <div className="space-y-2">{session.recording?.status && <Badge className="border-0 bg-sky-300 text-[#08204a] hover:bg-sky-200">{processingStatusLabel(session.recording.status)}</Badge>}<p className="text-sm text-slate-200">{pick("التسجيل غير متاح حاليًا", "The recording is not currently available")}</p></div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{pick("ملخص الجلسة", "Session summary")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {session.summary?.status && <Badge variant="secondary">{processingStatusLabel(session.summary.status)}</Badge>}
                  {session.summary?.title && <h3 className="break-words font-semibold">{session.summary.title}</h3>}
                  {session.summary?.content && <div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-4 text-sm leading-7">{session.summary.content}</div>}
                  {summaryNextSteps.length > 0 && (
                    <div><h3 className="text-sm font-semibold">{pick("الخطوات التالية", "Next steps")}</h3><ul className="mt-2 list-disc space-y-1 ps-5 text-sm">{summaryNextSteps.map((step, index) => <li key={`${index}-${step}`} className="break-words">{step}</li>)}</ul></div>
                  )}
                  {session.summary?.docUrl && <Button asChild variant="outline"><a href={session.summary.docUrl} target="_blank" rel="noreferrer"><ExternalLink className="me-2 h-4 w-4" />{pick("فتح مستند الملخص", "Open summary document")}</a></Button>}
                  {!hasSummaryDetails && <p className="text-sm text-muted-foreground">{pick("تفاصيل الملخص غير متاحة حاليًا", "Summary details are not currently available")}</p>}
                </CardContent>
              </Card>
            </div>
            <RecordingPlayerModal recording={selectedRecording} onClose={closeRecording} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-start gap-2 break-words font-medium">{icon}{value}</p>
    </div>
  );
}
