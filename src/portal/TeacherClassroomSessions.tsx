import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, FileText, RefreshCw, School, Video } from "lucide-react";
import { classroomRecordingsApi, type ClassroomSession } from "@/api/classroomRecordingsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardLayout from "@/layouts/DashboardLayout";

const sessionsFrom = (
  data: ClassroomSession[] | { sessions?: ClassroomSession[]; data?: ClassroomSession[] },
) => (Array.isArray(data) ? data : data.sessions || data.data || []);

const sessionIdOf = (session: ClassroomSession) => session.id || session._id || "";

const subjectName = (session: ClassroomSession) => {
  if (typeof session.subject === "object" && session.subject?.name) return session.subject.name;
  if (typeof session.classroomSubject === "object") return session.classroomSubject.subject?.name;
  return undefined;
};

const classroomName = (sessions: ClassroomSession[]) => {
  for (const session of sessions) {
    if (typeof session.classroomSubject === "object" && session.classroomSubject.classroom?.name) {
      return session.classroomSubject.classroom.name;
    }
  }
  return undefined;
};

export default function TeacherClassroomSessions() {
  const { classroomId = "" } = useParams<{ classroomId: string }>();
  const { language, pick } = useLanguage();
  const locale = language === "ar" ? "ar-EG-u-ca-gregory" : "en-US";
  const sessions = useQuery({
    queryKey: ["teacher-classroom-sessions", classroomId],
    queryFn: async () => sessionsFrom((await classroomRecordingsApi.listSessions(classroomId)).data),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    retry: 1,
  });
  const items = sessions.data || [];
  const name = classroomName(items);
  const formatDate = (value?: string) => {
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

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><School className="h-6 w-6" /></span>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{name || pick("جلسات الفصل", "Classroom sessions")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{pick("الجلسات المسجلة لهذا الفصل", "Sessions recorded for this classroom")}</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/portal/teacher/classrooms"><ArrowRight className="me-2 h-4 w-4" />{pick("العودة للفصول", "Back to classrooms")}</Link></Button>
        </header>

        {sessions.isPending ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label={pick("جاري تحميل الجلسات", "Loading sessions")}>
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-52 rounded-xl" />)}
          </div>
        ) : sessions.isError ? (
          <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><p className="text-destructive">{pick("تعذر تحميل جلسات الفصل.", "Unable to load classroom sessions.")}</p><Button variant="outline" onClick={() => void sessions.refetch()} disabled={sessions.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${sessions.isFetching ? "animate-spin" : ""}`} />{pick("إعادة المحاولة", "Retry")}</Button></CardContent></Card>
        ) : items.length === 0 ? (
          <Card><CardContent className="flex min-h-64 items-center justify-center p-6 text-center text-muted-foreground">{pick("لا توجد جلسات مسجلة لهذا الفصل.", "No sessions are recorded for this classroom.")}</CardContent></Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2" aria-label={pick("جلسات الفصل", "Classroom sessions")}>
            {items.map((session, index) => {
              const sessionId = sessionIdOf(session);
              const date = formatDate(session.scheduledStartAt || session.startAt);
              const content = (
                <CardContent className="flex h-full min-w-0 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold">{session.title || session.sessionName || pick("جلسة", "Session")}</h2>
                      {subjectName(session) && <p className="mt-1 break-words text-sm text-muted-foreground">{subjectName(session)}</p>}
                    </div>
                    {session.status && <Badge variant="secondary" className="shrink-0">{session.status}</Badge>}
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {session.sessionKind && <p className="flex items-center gap-2"><Video className="h-4 w-4 shrink-0" />{kindLabel(session.sessionKind)}</p>}
                    {date && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />{date}</p>}
                    {session.endAt && formatDate(session.endAt) && <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0" />{pick("النهاية", "End")}: {formatDate(session.endAt)}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {session.recording?.status && <Badge variant="outline"><Video className="me-1 h-3.5 w-3.5" />{pick("التسجيل", "Recording")}: {session.recording.status}</Badge>}
                    {session.summary?.status && <Badge variant="outline"><FileText className="me-1 h-3.5 w-3.5" />{pick("الملخص", "Summary")}: {session.summary.status}</Badge>}
                  </div>
                </CardContent>
              );
              return (
                <Card key={sessionId || `session-${index}`} className="overflow-hidden transition-shadow hover:shadow-md">
                  {sessionId ? <Link className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" to={`/portal/teacher/classrooms/${encodeURIComponent(classroomId)}/sessions/${encodeURIComponent(sessionId)}`}>{content}</Link> : content}
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
