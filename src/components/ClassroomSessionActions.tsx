import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, Loader2, Square, Timer, Video } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  endSession,
  getActiveClassroomSession,
  joinLesson,
  startClassroomSession,
} from "@/api/scheduleApi";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { Button } from "@/components/ui/button";

const formatDuration = (startedAt: string, now: number) => {
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());
  const seconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const sessionActionError = (value: unknown, fallback: string) => {
  const error = value as ApiError;
  const messages: Record<string, string> = {
    TOO_EARLY_TO_START: "لم يحن موعد بدء الحصة بعد. تم تحديث حالة الحصة.",
    START_WINDOW_CLOSED: "انتهت نافذة بدء الحصة. تم تحديث حالة الحصة.",
    SESSION_NOT_ACTIVE: "الحصة لم تعد مباشرة. تم تحديث الحالة.",
    CLASSROOM_ZOOM_NOT_CONFIGURED: "رابط Zoom للفصل غير مضبوط حاليًا.",
    MEETING_LINK_MISSING: "لم ترجع الخدمة رابط دخول صالحًا للحصة.",
  };
  return messages[error?.code] || messages[error?.message] || error?.message || fallback;
};

export default function ClassroomSessionActions({
  classroomId,
  className = "",
}: {
  classroomId: string;
  className?: string;
}) {
  const { user } = usePortalAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [startingSession, setStartingSession] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [endingRequested, setEndingRequested] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const startRequestRef = useRef(false);
  const joinRequestRef = useRef(false);
  const endRequestRef = useRef(false);
  const usesSessionControls = user?.role === "teacher" || user?.role === "student";
  const sessionQueryKey = useMemo(
    () => ["classroom-session-actions", classroomId, user?.role] as const,
    [classroomId, user?.role],
  );
  const classroomSession = useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => getActiveClassroomSession(classroomId),
    enabled: Boolean(classroomId) && usesSessionControls,
    staleTime: 10_000,
    retry: 1,
    refetchInterval: usesSessionControls ? 20_000 : false,
  });
  const activeSession = classroomSession.data;
  const liveStartedAt = activeSession?.status === "live"
    ? activeSession.actualStartedAt || activeSession.startAt || null
    : null;

  useEffect(() => {
    if (!liveStartedAt) return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [liveStartedAt]);

  useEffect(() => {
    if (!activeSession?.sessionId || ["ended", "completed", "cancelled"].includes(activeSession.status)) {
      setEndingRequested(false);
    }
  }, [activeSession?.sessionId, activeSession?.status]);

  const refreshClassroomSession = async () => {
    await cache.invalidateQueries({ queryKey: sessionQueryKey });
    await classroomSession.refetch();
  };

  const startClassroomLesson = async () => {
    if (user?.role !== "teacher" || !activeSession?.canStart || startingSession || startRequestRef.current) return;
    startRequestRef.current = true;
    setStartingSession(true);
    try {
      const result = await startClassroomSession(classroomId, activeSession);
      const meetingUrl = result.data.teacherStartUrl || result.data.meetingLink;
      if (meetingUrl) window.open(meetingUrl, "_blank", "noopener,noreferrer");
      const sessionId = result.data.session?.id || result.data.session?._id || activeSession.sessionId;
      if (sessionId) navigate(`/portal/teacher/classrooms/${encodeURIComponent(classroomId)}/sessions/${encodeURIComponent(sessionId)}`);
      await refreshClassroomSession();
    } catch (error) {
      const apiError = error as ApiError;
      if (["TOO_EARLY_TO_START", "START_WINDOW_CLOSED"].includes(apiError?.code)) {
        await refreshClassroomSession();
      }
      toast.error(sessionActionError(error, "تعذر بدء الحصة."));
    } finally {
      startRequestRef.current = false;
      setStartingSession(false);
    }
  };

  const joinClassroomLesson = async () => {
    if (user?.role !== "student" || activeSession?.status !== "live" || activeSession.canJoin !== true || joiningSession || joinRequestRef.current) return;
    joinRequestRef.current = true;
    setJoiningSession(true);
    try {
      const result = await joinLesson(classroomId);
      const meetingUrl = result.data?.meetingLink;
      if (!meetingUrl) throw new Error("MEETING_LINK_MISSING");
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.code === "SESSION_NOT_ACTIVE") await refreshClassroomSession();
      toast.error(sessionActionError(error, "تعذر دخول الحصة."));
    } finally {
      joinRequestRef.current = false;
      setJoiningSession(false);
    }
  };

  const endClassroomLesson = async () => {
    if (user?.role !== "teacher" || activeSession?.status !== "live" || !activeSession.sessionId || endingSession || endingRequested || endRequestRef.current) return;
    endRequestRef.current = true;
    setEndingSession(true);
    try {
      const result = await endSession(activeSession.sessionId);
      if (result.status === "awaiting_zoom_end") setEndingRequested(true);
      await refreshClassroomSession();
    } catch (error) {
      setEndingRequested(false);
      toast.error(sessionActionError(error, "تعذر إرسال طلب إنهاء الحصة."));
      await refreshClassroomSession();
    } finally {
      endRequestRef.current = false;
      setEndingSession(false);
    }
  };

  if (!usesSessionControls || !classroomId) return null;

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
      {user?.role === "teacher" && classroomSession.isPending && (
        <Button size="sm" disabled aria-live="polite">
          <Loader2 className="me-1 h-4 w-4 animate-spin" />
          جاري التحقق من موعد الحصة...
        </Button>
      )}
      {user?.role === "teacher" && activeSession?.status === "scheduled" && activeSession.canStart === true && (
        <Button size="sm" disabled={startingSession} onClick={() => void startClassroomLesson()}>
          {startingSession ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Video className="me-1 h-4 w-4" />}
          {startingSession ? "جاري البدء..." : "ابدأ الحصة"}
        </Button>
      )}
      {user?.role === "teacher" && activeSession?.status === "scheduled" && activeSession.startStatus === "NOT_OPEN" && (
        <span className="text-xs text-muted-foreground">لم يحن موعد بدء الحصة بعد</span>
      )}
      {user?.role === "teacher" && activeSession?.status === "starting" && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري بدء الحصة...</span>
      )}
      {user?.role === "teacher" && activeSession?.status === "live" && <>
        {liveStartedAt && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"><Timer className="h-3.5 w-3.5" />مدة الحصة <span dir="ltr">{formatDuration(liveStartedAt, clockNow)}</span></span>}
        {!endingRequested && <Button size="sm" variant="outline" disabled={endingSession} onClick={() => void endClassroomLesson()}>
          {endingSession ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Square className="me-1 h-4 w-4" />}
          {endingSession ? "جاري الإنهاء..." : "إنهاء الحصة"}
        </Button>}
      </>}
      {user?.role === "teacher" && (activeSession?.status === "awaiting_zoom_end" || endingRequested) && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />في انتظار تأكيد إنهاء الحصة...</span>
      )}
      {user?.role === "teacher" && ["ended", "completed"].includes(activeSession?.status || "") && (
        <span className="text-xs text-muted-foreground">انتهت الحصة</span>
      )}
      {user?.role === "student" && activeSession?.status === "live" && activeSession.canJoin === true && (
        <Button size="sm" disabled={joiningSession} onClick={() => void joinClassroomLesson()}>
          {joiningSession ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <LogIn className="me-1 h-4 w-4" />}
          {joiningSession ? "جاري الدخول..." : "دخول الحصة"}
        </Button>
      )}
    </div>
  );
}
