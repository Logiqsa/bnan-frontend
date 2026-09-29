import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Video,
} from "lucide-react";
import { deleteUnifiedScheduleEntry, endSession, getActiveClassroomSession, getAdminScheduleWeek, getUnifiedScheduleWeek, joinLesson, startLesson, upsertUnifiedScheduleEntry } from "@/api/scheduleApi";
import { coursesApi } from "@/api/coursesApi";
import { ApiError } from "@/api/client";
import type { PortalLesson, RegistrationMode } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassroomSessionActions from "@/components/ClassroomSessionActions";
import DashboardLayout from "@/layouts/DashboardLayout";
import { usePortalAuth } from "./PortalAuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import TeacherSessionAttendance from "./TeacherSessionAttendance";
import { formatScheduleTime } from "@/admin/zoom/classroomManagement";
import RecordingPlayerModal, { type PlayerRecording } from "@/components/RecordingPlayerModal";

const dayNames = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];
const days: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const getSaturday = (date: Date) => {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 1) % 7));
  return result;
};
const calendarDays = (month: Date) => {
  const start = getSaturday(new Date(month.getFullYear(), month.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
};
const isLessonEnded = (lesson: PortalLesson) =>
  lesson.activeSession?.status === "ended" ||
  (lesson.scheduleKind === "course" && lesson.activeSession?.status === "awaiting_zoom_end");
const sessionRecording = (lesson: PortalLesson) =>
  lesson.activeSession?.recordingUrl ||
  lesson.activeSession?.recording_url ||
  null;
const sessionSummary = (lesson: PortalLesson) =>
  lesson.activeSession?.summaryUrl ||
  lesson.activeSession?.summary_url ||
  lesson.activeSession?.summary ||
  lesson.activeSession?.aiReport ||
  lesson.activeSession?.ai_report ||
  null;
const isWebUrl = (value: string) => /^https?:\/\//i.test(value);
const isLiveForTeacher = (lesson: PortalLesson) => {
  const status = lesson.activeSession?.status;
  return status === "live" || status === "starting";
};
const courseLessonPhase = (lesson: PortalLesson) => {
  if (isLessonEnded(lesson)) return "ended" as const;
  if (
    lesson.activeSession?.status === "live" ||
    lesson.activeSession?.status === "starting"
  )
    return "live" as const;
  if (!lesson.date) return "upcoming" as const;
  const start = new Date(`${lesson.date}T${lesson.startTime}:00`);
  const end = lesson.endTime
    ? new Date(`${lesson.date}T${lesson.endTime}:00`)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const now = new Date();
  return now < start
    ? ("upcoming" as const)
    : now > end
      ? ("ended" as const)
      : ("ready" as const);
};

export default function PortalSchedule({
  role,
}: {
  role: "teacher" | "student" | "admin";
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = usePortalAuth();
  const { isArabic, pick } = useLanguage();
  const locale = isArabic ? "ar-EG-u-ca-gregory" : "en-US-u-ca-gregory";
  const localizedDayNames = isArabic
    ? dayNames
    : ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const localizedDays: Record<string, string> = isArabic
    ? days
    : {
        saturday: "Saturday",
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
      };
  const statusText = (lesson: PortalLesson, student: boolean) => {
    const status = lesson.activeSession?.status;
    if (status === "live" || (status === "starting" && !student))
      return pick("الحصة مباشرة الآن", "Lesson is live now");
    if (status === "starting")
      return pick("يجري تجهيز الحصة", "Preparing the lesson");
    if (status === "awaiting_zoom_end")
      return pick("الحصة في انتظار الإنهاء", "Waiting for the lesson to end");
    if (isLessonEnded(lesson)) return pick("انتهت", "Ended");
    return student
      ? pick("لم تبدأ الحصة بعد", "Lesson has not started yet")
      : pick("موعد مجدول", "Scheduled");
  };
  const modeKey =
    role === "student"
      ? user?.registrationMode || "egyptian"
      : "egyptian,gulf";
  const today = dateKey(new Date());
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [lessons, setLessons] = useState<PortalLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | RegistrationMode>("all");
  const [selected, setSelected] = useState<PortalLesson | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<PlayerRecording | null>(null);
  const [attendanceContext, setAttendanceContext] = useState<{
    sessionId: string;
    classroomId: string;
    readOnly: boolean;
  } | null>(null);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [endTarget, setEndTarget] = useState<{ sessionId: string; classroomId: string } | null>(null);
  const [ending, setEnding] = useState(false);
  const endingRef = useRef(false);
  const [endError, setEndError] = useState("");
  const [awaitingEnd, setAwaitingEnd] = useState<{ sessionId: string; classroomId: string; until: number } | null>(null);
  const endStateRefreshRef = useRef<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(false);
  const selectedRegularActive = role === "teacher" && selected?.scheduleKind !== "course" &&
    (selected?.activeSession?.status === "starting" || selected?.activeSession?.status === "live" || selected?.activeSession?.status === "awaiting_zoom_end");
  const activeSessionQuery = useQuery({
    queryKey: ["teacher-regular-active-session", selectedRegularActive ? selected.classroom.id : ""],
    queryFn: () => getActiveClassroomSession(selected!.classroom.id),
    enabled: Boolean(selectedRegularActive),
    staleTime: 0,
    retry: 1,
    refetchInterval: (query) =>
      awaitingEnd && selected?.classroom.id === awaitingEnd.classroomId &&
      Date.now() < awaitingEnd.until && query.state.data?.status !== "ended" && query.state.data !== null
        ? 5000
        : false,
  });
  const selectedSessionId = selected?.activeSession?.id || selected?.activeSession?.sessionId;
  const verifiedActiveSession = activeSessionQuery.data?.sessionId &&
    activeSessionQuery.data.sessionId === selectedSessionId &&
    activeSessionQuery.data.teacher?.userId === user?.id
      ? activeSessionQuery.data
      : null;
  const waitingForZoom = selected?.scheduleKind !== "course" && (
    selected?.activeSession?.status === "awaiting_zoom_end" ||
    (awaitingEnd?.sessionId && awaitingEnd.sessionId === selectedSessionId)
  );
  const grid = useMemo(() => calendarDays(month), [month]);
  const weekKey = useMemo(
    () =>
      Array.from(new Set(grid.map((date) => dateKey(getSaturday(date))))).join(
        ",",
      ),
    [grid],
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const unifiedWeeks = await Promise.all(
        weekKey.split(",").map((week) =>
          role === "admin"
            ? getAdminScheduleWeek(
                week,
                filter !== "all" ? filter : undefined,
              )
            : getUnifiedScheduleWeek(
                week,
                role === "teacher" && filter !== "all" ? filter : undefined,
              ),
        ),
      );
      const unified = new Map<string, PortalLesson>();
      unifiedWeeks.flatMap((week) => week.lessons).forEach((lesson) => {
        unified.set(lesson.key, lesson);
      });
      setLessons([...unified.values()]);
    } catch (value) {
      setError(
        (value as ApiError).message ||
          pick("تعذر تحميل الجدول.", "Unable to load the schedule."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    weekKey,
    filter,
    pick,
    role,
  ]);
  useEffect(() => {
    setLoading(true);
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void load(), 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    setSelected((current) =>
      current
        ? lessons.find((lesson) => lesson.key === current.key) || current
        : null,
    );
  }, [lessons]);
  useEffect(() => {
    setScheduleStartTime(selected?.startTime || "");
    setScheduleEndTime(selected?.endTime || "");
  }, [selected]);
  useEffect(() => {
    if (!awaitingEnd || !selected || selected.classroom.id !== awaitingEnd.classroomId) return;
    if (selected.activeSession?.status === "ended") {
      setAwaitingEnd(null);
    } else if (activeSessionQuery.isSuccess && activeSessionQuery.data === null && endStateRefreshRef.current !== awaitingEnd.sessionId) {
      endStateRefreshRef.current = awaitingEnd.sessionId;
      void load();
    }
  }, [activeSessionQuery.data, activeSessionQuery.isSuccess, awaitingEnd, load, selected]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? lessons
        : lessons.filter((lesson) => lesson.registrationMode === filter),
    [lessons, filter],
  );
  const byDate = useMemo(() => {
    const result = new Map<string, PortalLesson[]>();
    visible.forEach((lesson) => {
      if (!lesson.date) return;
      const list = result.get(lesson.date) || [];
      list.push(lesson);
      result.set(lesson.date, list);
    });
    return result;
  }, [visible]);
  const selectedLessons = byDate.get(selectedDate) || [];
  const selectedObject = parseDate(selectedDate);
  const changeMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(dateKey(next));
  };
  const join = async () => {
    if (
      !selected ||
      (role === "student"
        ? selected.activeSession?.status !== "live"
        : !isLiveForTeacher(selected))
    )
      return;
    setJoining(true);
    try {
      const url =
        selected.scheduleKind === "course"
          ? (await coursesApi.joinActiveSession(selected.classroom.id))
              .meetingLink
          : (await joinLesson(selected.classroom.id)).data?.meetingLink;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setError("لم ترجع الخدمة رابط دخول صالحًا.");
    } catch (value) {
      setError((value as ApiError).message || "تعذر دخول الحصة.");
    } finally {
      setJoining(false);
      setSelected(null);
    }
  };
  const requestEnd = async () => {
    if (!endTarget || endingRef.current || !verifiedActiveSession ||
      verifiedActiveSession.sessionId !== endTarget.sessionId ||
      !["starting", "live"].includes(verifiedActiveSession.status)) return;
    endingRef.current = true;
    setEnding(true);
    setEndError("");
    try {
      await endSession(endTarget.sessionId);
      endStateRefreshRef.current = null;
      setAwaitingEnd({ ...endTarget, until: Date.now() + 120_000 });
      setEndTarget(null);
      void activeSessionQuery.refetch();
      void load();
      void queryClient.invalidateQueries({ queryKey: ["teacher-schedule", selected?.registrationMode] });
    } catch (value) {
      const apiError = value as ApiError;
      setEndError(
        apiError.status === 403 ? pick("غير مصرح لك بإنهاء هذه الحصة.", "You are not allowed to end this session.") :
        apiError.status === 404 ? pick("الحصة غير موجودة أو لم تعد متاحة.", "The session was not found or is no longer available.") :
        apiError.status === 409 ? pick("الحصة لم تعد قابلة للإنهاء. حدّث الجدول وحاول مجددًا.", "This session can no longer be ended. Refresh the schedule and try again.") :
        apiError.status === 401 ? pick("انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.", "Your sign-in expired. Please sign in again.") :
        apiError.message || pick("تعذر إرسال طلب الإنهاء. حاول مرة أخرى.", "Unable to request session ending. Please try again."),
      );
    } finally {
      endingRef.current = false;
      setEnding(false);
    }
  };
  const start = async () => {
    if (!selected || starting || isLessonEnded(selected)) return;
    setStarting(true);
    setStartError("");
    try {
      const courseSession =
        selected.scheduleKind === "course" &&
        selected.courseId &&
        selected.courseGroupId
          ? await coursesApi.startCourseSession(selected.classroom.id, {
              courseId: selected.courseId,
              groupId: selected.courseGroupId,
              occurrenceDate: selected.date || today,
              scheduledStartTime: selected.startTime,
            })
          : null;
      const regularSession = courseSession ? null : await startLesson(selected);
      const url =
        courseSession?.teacherStartUrl ||
        courseSession?.meetingLink ||
        regularSession?.data.teacherStartUrl ||
        regularSession?.data.meetingLink;
      if (!url) {
        setStartError("بدأت الحصة، لكن الخدمة لم تُرجع رابط Zoom صالحًا.");
        await load();
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      if (
        !(
          courseSession?.teacherStartUrl || regularSession?.data.teacherStartUrl
        )
      )
        setError(
          "بدأت الحصة، لكن Zoom لم يُرجع رابط المضيف؛ تم فتح رابط الانضمام العادي.",
        );
      setSelected(null);
      await load();
    } catch (value) {
      const apiError = value as ApiError;
      const timestamp =
        apiError.code === "TOO_EARLY_TO_START"
          ? apiError.data?.allowedStartAt
          : apiError.code === "START_WINDOW_CLOSED"
            ? apiError.data?.windowClosesAt
            : null;
      const time =
        typeof timestamp === "string"
          ? new Date(timestamp).toLocaleTimeString("ar-EG-u-ca-gregory", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Africa/Cairo",
            })
          : "";
      const messages: Record<string, string> = {
        TOO_EARLY_TO_START: `لم يحن موعد بدء الحصة بعد${time ? `؛ يمكنك البدء الساعة ${time}` : ""}.`,
        START_WINDOW_CLOSED: `انتهت نافذة بدء الحصة${time ? ` الساعة ${time}` : ""}.`,
        SCHEDULE_OCCURRENCE_NOT_FOUND: "لم يتم العثور على هذه الحصة في الجدول.",
        COURSE_SCHEDULE_OCCURRENCE_NOT_FOUND:
          "لم يتم العثور على هذه الحصة في جدول الدورة.",
        CLASSROOM_SESSION_ALREADY_ACTIVE: "هناك حصة مباشرة بالفعل لهذا الفصل.",
        TEACHER_NOT_APPROVED: "حساب المعلم غير معتمد بعد.",
        TEACHER_NOT_ASSIGNED_TO_SUBJECT: "أنت غير مكلّف بهذه المادة.",
        COURSE_TEACHER_ACCESS_DENIED: "غير مصرح لك ببدء هذه الدورة.",
        ZOOM_MEETING_NOT_READY: "رابط Zoom الخاص بالمجموعة غير جاهز.",
      };
      setStartError(
        messages[apiError.code] || apiError.message || "تعذر بدء الحصة.",
      );
    } finally {
      setStarting(false);
    }
  };
  const openRecording = () => {
    if (!selected) return;
    const value = sessionRecording(selected);
    if (value) setSelectedRecording({
      sessionName: selected.subject.name,
      recordingLink: value,
    });
  };
  const openSummary = () => {
    if (!selected) return;
    const value = sessionSummary(selected);
    if (!value) return;
    if (isWebUrl(value)) window.open(value, "_blank", "noopener,noreferrer");
    else setSummaryText(value);
  };
  const canManageGulfEntry = role === "teacher" && selected?.scheduleKind === "classroom" && selected.registrationMode === "gulf" && Boolean(selected.classroomSubjectId);
  const saveGulfEntry = async () => {
    if (!selected || !canManageGulfEntry) return;
    setSavingSchedule(true);
    setStartError("");
    try {
      await upsertUnifiedScheduleEntry(selected.classroom.id, {
        day: selected.day,
        classroomSubjectId: selected.classroomSubjectId,
        startTime: scheduleStartTime || selected.startTime,
        endTime: scheduleEndTime || selected.endTime || "",
      });
      await load();
      setSelected(null);
    } catch (value) {
      setStartError((value as ApiError).message || pick("تعذر حفظ موعد الحصة.", "Unable to save the lesson time."));
    } finally { setSavingSchedule(false); }
  };
  const deleteGulfEntry = async () => {
    if (!selected?.scheduleEntryId || !canManageGulfEntry) return;
    if (!window.confirm(pick("هل تريد حذف هذا الموعد فقط؟", "Delete only this schedule entry?"))) return;
    setDeletingSchedule(true);
    setStartError("");
    try {
      await deleteUnifiedScheduleEntry(selected.classroom.id, selected.scheduleEntryId);
      setSelected(null);
      await load();
    } catch (value) {
      setStartError((value as ApiError).message || pick("تعذر حذف موعد الحصة.", "Unable to delete the lesson time."));
    } finally { setDeletingSchedule(false); }
  };

  return (
    <DashboardLayout>
      <section className="py-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="text-secondary" />
              {pick("جدول الحصص", "Lesson schedule")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === "admin"
                ? pick(
                    "متابعة حصص جميع الفصول خلال الشهر — بتوقيت Africa/Cairo",
                    "Track all classroom lessons throughout the month — Africa/Cairo time",
                  )
                : pick(
                    "متابعة حصصك خلال الشهر — بتوقيت Africa/Cairo",
                    "Track your lessons throughout the month — Africa/Cairo time",
                  )}
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            {pick("تحديث", "Refresh")}
          </Button>
        </div>
        {modeKey.includes(",") && (
          <Tabs
            value={filter}
            onValueChange={(value) =>
              setFilter(value as "all" | RegistrationMode)
            }
            className="mb-5"
          >
            <TabsList>
              <TabsTrigger value="all">{pick("الكل", "All")}</TabsTrigger>
              <TabsTrigger value="egyptian">
                {pick("المنهج المصري", "Egyptian curriculum")}
              </TabsTrigger>
              <TabsTrigger value="gulf">
                {pick("المنهج الخليجي", "Gulf curriculum")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-destructive/10 text-destructive p-4"
          >
            {error}
          </div>
        )}
        <Card className="shadow-elegant overflow-hidden">
          <CardContent className="p-0">
            <div dir="ltr" className="portal-schedule-layout min-h-[590px]">
              <div
                dir={isArabic ? "rtl" : "ltr"}
                className="portal-calendar-panel p-5 md:p-8"
              >
                <div className="flex items-center justify-between mb-7">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => changeMonth(1)}
                    aria-label={pick("الشهر التالي", "Next month")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <h2 className="font-bold text-lg">
                      {month.toLocaleDateString(locale, {
                        month: "long",
                        year: "numeric",
                      })}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {visible.length} {pick("حصة", "lessons")}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => changeMonth(-1)}
                    aria-label={pick("الشهر السابق", "Previous month")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {localizedDayNames.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs md:text-sm text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                {loading ? (
                  <div className="h-80 rounded-xl bg-muted animate-pulse" />
                ) : (
                  <div className="grid grid-cols-7 gap-y-2">
                    {grid.map((date) => {
                      const key = dateKey(date);
                      const count = byDate.get(key)?.length || 0;
                      const outside = date.getMonth() !== month.getMonth();
                      const active = key === selectedDate;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedDate(key)}
                          className="relative h-12 md:h-14 grid place-items-center group"
                          aria-label={`${date.getDate()}، ${count} حصة`}
                        >
                          <span
                            className={`h-10 w-10 rounded-full grid place-items-center text-sm transition-all ${active ? "bg-primary text-primary-foreground shadow-sky" : outside ? "text-muted-foreground/35" : "hover:bg-secondary/25"}`}
                          >
                            {date.getDate()}
                          </span>
                          {count > 0 && (
                            <span
                              aria-hidden="true"
                              className={`absolute bottom-0 h-2 w-2 rounded-full ring-2 ring-card ${active ? "bg-secondary" : "bg-primary"}`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <aside
                dir={isArabic ? "rtl" : "ltr"}
                className="portal-lessons-panel p-5 md:p-8 bg-card"
              >
                <div className="flex items-center justify-between border-b pb-4 mb-5">
                  <div>
                    <h2 className="font-bold">
                      {pick("حصص", "Lessons for")}{" "}
                      {selectedObject.toLocaleDateString(locale, {
                        weekday: "long",
                      })}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedObject.toLocaleDateString(locale, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-xs bg-muted rounded-full px-3 py-1">
                    {selectedLessons.length} {pick("حصة", "lessons")}
                  </span>
                </div>
                {loading ? (
                  <div
                    className="h-80 grid place-items-center text-center text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>{pick("جارٍ تحميل الجدول...", "Loading schedule...")}</span>
                    </div>
                  </div>
                ) : selectedLessons.length === 0 ? (
                  <div className="h-80 grid place-items-center text-center text-muted-foreground">
                    <div>
                      <CalendarDays className="h-9 w-9 mx-auto mb-3 opacity-40" />
                      <p>
                        {pick(
                          "لا توجد حصص في هذا اليوم",
                          "There are no lessons on this day",
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedLessons
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((lesson) => {
                        const ended = isLessonEnded(lesson);
                        const waiting = !ended && lesson.scheduleKind !== "course" &&
                          (lesson.activeSession?.status === "awaiting_zoom_end" ||
                            (awaitingEnd?.sessionId && awaitingEnd.sessionId === (lesson.activeSession?.id || lesson.activeSession?.sessionId)));
                        return (
                          <button
                            key={lesson.key}
                            onClick={() => setSelected(lesson)}
                            className={`w-full ${isArabic ? "text-right" : "text-left"} rounded-xl border p-4 transition-all ${ended ? "bg-muted/50 hover:border-secondary hover:shadow-sky" : "hover:border-secondary hover:shadow-sky"}`}
                          >
                            <div className="flex justify-between gap-3">
                              <div>
                                <h3 className="font-bold">
                                  {lesson.subject.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {lesson.classroom.name}
                                </p>
                              </div>
                              <span
                                dir="ltr"
                                className="font-semibold text-primary"
                              >
                                {formatScheduleTime(lesson.startTime, isArabic)}
                              </span>
                            </div>
                            {role !== "teacher" &&
                              lesson.scheduleKind !== "course" && (
                                <p className="text-sm mt-2">
                                  {pick("المعلم:", "Teacher:")}{" "}
                                  {lesson.teacher?.name ||
                                    lesson.teacher?.fullName ||
                                    pick("غير متاح", "Unavailable")}
                                </p>
                              )}
                            <div className="flex items-center justify-between mt-3">
                              <span
                                className={`text-xs font-semibold ${waiting ? "text-amber-700" : lesson.activeSession?.status === "live" || (role === "teacher" && isLiveForTeacher(lesson)) ? "text-green-600" : ended ? "text-destructive" : "text-muted-foreground"}`}
                              >
                                {waiting ? pick("في انتظار انتهاء Zoom...", "Waiting for Zoom to end...") : statusText(lesson, role === "student")}
                              </span>
                              <span className="text-xs rounded-full bg-secondary/20 px-2 py-1">
                                {lesson.scheduleKind === "course"
                                  ? pick("دورة", "Course")
                                  : lesson.registrationMode === "egyptian"
                                    ? pick("مصري", "Egyptian")
                                    : pick("خليجي", "Gulf")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </aside>
            </div>
          </CardContent>
        </Card>
      </section>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !starting && !endTarget) {
            setSelected(null);
            setStartError("");
          }
        }}
      >
        <DialogContent dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {selected && isLessonEnded(selected)
                ? pick("الحصة انتهت", "Lesson ended")
                : waitingForZoom
                  ? pick("في انتظار انتهاء Zoom", "Waiting for Zoom to end")
                : role === "teacher" && selected && isLiveForTeacher(selected)
                  ? pick("الحصة مباشرة الآن", "Lesson is live now")
                  : selected?.scheduleKind === "course"
                    ? pick("تفاصيل موعد الدورة", "Course session details")
                  : canManageGulfEntry
                    ? pick("إدارة موعد الحصة", "Manage lesson time")
                    : role === "teacher"
                      ? pick("هل تريد بدء الحصة الآن؟", "Start the lesson now?")
                      : pick("تفاصيل الحصة", "Lesson details")}
            </DialogTitle>
            <DialogDescription>
              {selected?.subject.name} — {selected?.classroom.name} —{" "}
              {selected && localizedDays[selected.day]}، {pick("الساعة", "at")}{" "}
              <span dir="ltr">{selected && formatScheduleTime(selected.startTime, isArabic)}</span>
            </DialogDescription>
          </DialogHeader>
          {canManageGulfEntry && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-semibold">{pick("إدارة موعد المادة", "Manage subject time")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm"><span>{pick("وقت البداية", "Start time")}</span><Input type="time" value={scheduleStartTime} onChange={(event) => setScheduleStartTime(event.target.value)} /></label>
                <label className="grid gap-1 text-sm"><span>{pick("وقت النهاية", "End time")}</span><Input type="time" value={scheduleEndTime} onChange={(event) => setScheduleEndTime(event.target.value)} /></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void saveGulfEntry()} disabled={savingSchedule || deletingSchedule}>{savingSchedule ? pick("جارٍ الحفظ...", "Saving...") : pick("حفظ الموعد", "Save time")}</Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void deleteGulfEntry()} disabled={savingSchedule || deletingSchedule || !selected?.scheduleEntryId}>{deletingSchedule ? pick("جارٍ الحذف...", "Deleting...") : pick("حذف الموعد", "Delete time")}</Button>
              </div>
              <div className="mt-4 border-t pt-4">
                <ClassroomSessionActions classroomId={selected!.classroom.id} />
              </div>
            </div>
          )}
          {selected && isLessonEnded(selected) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-20 gap-2"
                variant="outline"
                disabled={!sessionRecording(selected)}
                onClick={openRecording}
              >
                <Video className="h-5 w-5" />
                {sessionRecording(selected)
                  ? pick("فتح التسجيل", "Open recording")
                  : pick("جاري معالجة التسجيل", "Recording is processing")}
              </Button>
              <Button
                className="h-20 gap-2"
                variant="outline"
                disabled={!sessionSummary(selected)}
                onClick={openSummary}
              >
                <FileText className="h-5 w-5" />
                {pick("فتح الملخص", "Open summary")}
              </Button>
            </div>
          ) : waitingForZoom ? (
            <div className="rounded-xl border bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
              {awaitingEnd?.sessionId === selectedSessionId
                ? pick("تم إرسال طلب إنهاء الحصة، في انتظار تأكيد انتهاء Zoom...", "Session ending was requested. Waiting for Zoom to confirm it has ended...")
                : pick("الحصة في انتظار انتهاء Zoom...", "Waiting for Zoom to end...")}
            </div>
          ) : !canManageGulfEntry && (
            <>
              {role === "teacher" && startError && (
                <div
                  role="alert"
                  className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm"
                >
                  {startError}
                </div>
              )}
              {role === "teacher" &&
                selected?.scheduleKind === "course" &&
                courseLessonPhase(selected) === "upcoming" && (
                  <div className="rounded-xl bg-muted p-3 text-sm">
                    لن يظهر زر بدء الحصة إلا بعد حلول موعدها.
                  </div>
                )}
              {role === "student" &&
                selected?.activeSession?.status !== "live" && (
                  <div className="rounded-xl bg-muted p-3 text-sm">
                    {pick(
                      "لا يمكن الدخول إلا بعد بداية الحصة من قبل المعلم.",
                      "You can join only after the teacher starts the lesson.",
                    )}
                  </div>
                )}
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={starting}
                  onClick={() => {
                    setSelected(null);
                    setStartError("");
                  }}
                >
                  {pick("إلغاء", "Cancel")}
                </Button>
                {role === "teacher" &&
                selected?.scheduleKind === "course" &&
                courseLessonPhase(selected) === "ended" ? (
                  <Button
                    onClick={() =>
                      navigate(
                        `/portal/teacher/course-recordings/${selected.classroom.id}`,
                      )
                    }
                  >
                    <Video className="me-2 h-4 w-4" />
                    عرض التسجيلات
                  </Button>
                ) : role === "teacher" &&
                  selected?.scheduleKind === "course" &&
                  courseLessonPhase(selected) === "upcoming" ? null : role ===
                  "teacher" ? (
                  <Button
                    disabled={starting}
                    onClick={
                      selected && isLiveForTeacher(selected) ? join : start
                    }
                  >
                    {starting || joining
                      ? pick("جاري التجهيز...", "Preparing...")
                      : selected && isLiveForTeacher(selected)
                        ? pick("دخول الحصة", "Join lesson")
                        : pick("بدء الحصة", "Start lesson")}
                  </Button>
                ) : role === "admin" ? null : (
                  <Button
                    disabled={
                      selected?.activeSession?.status !== "live" || joining
                    }
                    onClick={join}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {joining
                      ? pick("جاري التجهيز...", "Preparing...")
                      : pick("دخول الحصة", "Join lesson")}
                  </Button>
                )}
                {role === "teacher" && selected?.scheduleKind !== "course" &&
                  selected && isLiveForTeacher(selected) && verifiedActiveSession &&
                  (verifiedActiveSession.status === "live" || verifiedActiveSession.status === "starting") &&
                  awaitingEnd?.sessionId !== selectedSessionId && (
                    <Button
                      variant="destructive"
                      disabled={ending}
                      onClick={() => {
                        setEndError("");
                        setEndTarget({ sessionId: verifiedActiveSession.sessionId, classroomId: selected.classroom.id });
                      }}
                    >
                      {pick("طلب إنهاء الحصة", "Request session end")}
                    </Button>
                  )}
              </DialogFooter>
            </>
          )}
          {role === "teacher" && selectedSessionId && (
            <Button variant="outline" className="w-full gap-2" onClick={() => {
              setAttendanceContext({
                sessionId: selectedSessionId,
                classroomId: selected.classroom.id,
                readOnly: selected.registrationMode !== "gulf",
              });
              setSelected(null);
            }}>
              <ClipboardList className="h-4 w-4" />
              {pick("الحضور", "Attendance")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
      {role === "teacher" && attendanceContext && (
        <TeacherSessionAttendance
          sessionId={attendanceContext.sessionId}
          classroomId={attendanceContext.classroomId}
          readOnly={attendanceContext.readOnly}
          onClose={() => setAttendanceContext(null)}
        />
      )}
      <Dialog open={Boolean(endTarget)} onOpenChange={(open) => { if (!open && !ending) { setEndTarget(null); setEndError(""); } }}>
        <DialogContent dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{pick("طلب إنهاء الحصة", "Request session end")}</DialogTitle>
            <DialogDescription>{pick("هل تريد طلب إنهاء هذه الحصة؟ سيتم تأكيد انتهائها بعد انتهاء Zoom.", "Do you want to request ending this session? Completion will be confirmed after Zoom ends.")}</DialogDescription>
          </DialogHeader>
          {endError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{endError}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={ending} onClick={() => { setEndTarget(null); setEndError(""); }}>{pick("إلغاء", "Cancel")}</Button>
            <Button variant="destructive" disabled={ending} onClick={() => void requestEnd()}>
              {ending ? pick("جاري إرسال الطلب...", "Sending request...") : pick("طلب الإنهاء", "Request end")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!summaryText}
        onOpenChange={(open) => {
          if (!open) setSummaryText(null);
        }}
      >
        <DialogContent dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{pick("ملخص الحصة", "Lesson summary")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-7">
            {summaryText}
          </div>
          <DialogFooter>
            <Button onClick={() => setSummaryText(null)}>
              {pick("إغلاق", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RecordingPlayerModal
        recording={selectedRecording}
        onClose={() => setSelectedRecording(null)}
      />
    </DashboardLayout>
  );
}
