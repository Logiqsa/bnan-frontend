import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
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
import { teacherClassroomsApi } from "@/api/teacherClassroomsApi";
import { teacherSessionReportApi } from "@/api/teacherSessionReportApi";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import TeacherSessionAttendance from "./TeacherSessionAttendance";

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
  const [reportPage, setReportPage] = useState(1);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
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
  const classroomsQuery = useQuery({
    queryKey: ["teacher-classrooms"],
    queryFn: teacherClassroomsApi.listMine,
    enabled: Boolean(classroomId) && sessionQuery.isSuccess && !classroomMismatch,
    staleTime: 30_000,
    retry: 1,
  });
  const reportQuery = useQuery({
    queryKey: ["teacher-session-report", sessionId, reportPage],
    queryFn: () => teacherSessionReportApi.getReport(sessionId, reportPage, 50),
    enabled: Boolean(sessionId) && sessionQuery.isSuccess && !classroomMismatch,
    staleTime: 30_000,
    retry: 1,
  });

  const registrationMode = classroomsQuery.data?.find(
    (classroom) => classroom.classroomId === resolvedClassroomId,
  )?.registrationMode;
  const attendanceReadOnly = registrationMode !== "gulf";
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
  const kindLabel = (kind?: string) => {
    if (kind === "live") return pick("حصة مباشرة", "Live session");
    if (kind === "manual_recording") return pick("تسجيل يدوي", "Manual recording");
    return kind;
  };

  const backPath = classroomMismatch
    ? "/portal/teacher/classrooms"
    : `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}`;
  const notFound = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 404;

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
                    {session.status && <Badge variant="secondary">{session.status}</Badge>}
                    {session.sessionKind && <Badge variant="outline">{kindLabel(session.sessionKind)}</Badge>}
                  </div>
                </div>
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
                <TeacherSessionAttendance sessionId={sessionId} classroomId={resolvedClassroomId} readOnly={attendanceReadOnly} embedded />
                {registrationMode !== "gulf" && !classroomsQuery.isPending && (
                  <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    {registrationMode === "egyptian"
                      ? pick("الحضور متاح للعرض فقط لهذا الفصل.", "Attendance is read-only for this classroom.")
                      : pick("تعذر تأكيد نظام تسجيل الفصل؛ الحضور متاح للعرض فقط.", "The classroom registration mode could not be confirmed, so attendance is read-only.")}
                  </p>
                )}
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
                      {report.status && <Badge variant="secondary">{pick("الحالة", "Status")}: {report.status}</Badge>}
                      {typeof report.summary?.uniqueParticipants === "number" && <Badge variant="outline">{pick("المشاركون", "Participants")}: {report.summary.uniqueParticipants}</Badge>}
                      {typeof report.summary?.durationMinutes === "number" && <Badge variant="outline">{pick("المدة", "Duration")}: {report.summary.durationMinutes} {pick("دقيقة", "minutes")}</Badge>}
                    </div>
                    {report.participants.length === 0 ? (
                      <p className="rounded-lg bg-muted/40 p-5 text-center text-sm text-muted-foreground">{pick("لا توجد بيانات مشاركين متاحة.", "No participant data is available.")}</p>
                    ) : (
                      <details className="rounded-lg border" open>
                        <summary className="cursor-pointer px-4 py-3 font-medium">{pick("عرض المشاركين", "View participants")} ({pagination?.total ?? report.participants.length})</summary>
                        <div className="space-y-3 border-t p-3 sm:p-4">
                          {report.participants.map((participant, index) => (
                            <div key={`${participant.email || participant.name || "participant"}-${index}`} className="min-w-0 rounded-lg bg-muted/40 p-3 text-sm">
                              <p className="break-words font-medium">{participant.name || pick("مشارك", "Participant")}</p>
                              {participant.email && <p className="mt-1 break-all text-xs text-muted-foreground">{participant.email}</p>}
                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                {formatDate(participant.joinTime) && <span>{pick("الدخول", "Joined")}: {formatDate(participant.joinTime)}</span>}
                                {formatDate(participant.leaveTime) && <span>{pick("الخروج", "Left")}: {formatDate(participant.leaveTime)}</span>}
                                {typeof participant.durationSeconds === "number" && <span>{pick("المدة", "Duration")}: {participant.durationSeconds} {pick("ثانية", "seconds")}</span>}
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
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />{pick("التسجيل", "Recording")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {session.recording?.status && <Badge variant="secondary">{session.recording.status}</Badge>}
                  {session.recording?.localUrl || session.recording?.shareUrl ? (
                    <Button onClick={() => setSelectedRecording({
                      sessionName: session.title || session.sessionName || pick("تسجيل الحصة", "Session recording"),
                      recordingLink: session.recording?.localUrl || session.recording?.shareUrl || "",
                    })}><Play className="me-2 h-4 w-4" />{pick("مشاهدة التسجيل", "Watch recording")}</Button>
                  ) : <p className="text-sm text-muted-foreground">{pick("التسجيل غير متاح حاليًا", "The recording is not currently available")}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{pick("ملخص الجلسة", "Session summary")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {session.summary?.status && <Badge variant="secondary">{session.summary.status}</Badge>}
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
