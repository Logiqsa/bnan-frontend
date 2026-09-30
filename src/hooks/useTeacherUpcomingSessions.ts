import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getUnifiedScheduleWeek } from "@/api/scheduleApi";
import type { PortalLesson, RegistrationMode } from "@/api/types";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfCurrentWeek = () => {
  const saturday = new Date();
  saturday.setHours(12, 0, 0, 0);
  saturday.setDate(saturday.getDate() - ((saturday.getDay() + 1) % 7));
  return saturday;
};

const lessonDateTime = (lesson: PortalLesson, time: string) => {
  if (!lesson.date) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const value = new Date(`${lesson.date}T${normalizedTime}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

export const useTeacherUpcomingSessions = (
  registrationModes?: RegistrationMode[],
  enabled = true,
) => {
  const modes = useMemo<RegistrationMode[]>(() => {
    const supported = (registrationModes || []).filter(
      (mode): mode is RegistrationMode =>
        mode === "egyptian" || mode === "gulf",
    );
    return [...new Set(supported)] as RegistrationMode[];
  }, [registrationModes]);
  const weekStartDate = useMemo(startOfCurrentWeek, []);
  const weekStart = dateKey(weekStartDate);
  const queries = useQueries({
    queries: [
      ...(modes.length ? modes : [undefined]).map((mode) => ({
        queryKey: ["teacher-schedule", mode || "all", weekStart] as const,
        queryFn: () => getUnifiedScheduleWeek(weekStart, mode),
        enabled,
        staleTime: 30_000,
        retry: 1,
      })),
    ],
  });

  const lessons = useMemo(() => {
    const unique = new Map<string, PortalLesson>();
    queries.forEach((query) => {
      const data = query.data as { lessons?: PortalLesson[] } | undefined;
      data?.lessons?.forEach((lesson) => unique.set(lesson.key, lesson));
    });

    const now = new Date();
    return [...unique.values()]
      .map((lesson) => {
        if (["ended", "completed"].includes(lesson.activeSession?.status || "")) {
          return null;
        }
        const startsAt = lessonDateTime(lesson, lesson.startTime);
        if (!startsAt) return null;
        const endsAt = lesson.endTime
          ? lessonDateTime(lesson, lesson.endTime)
          : new Date(startsAt.getTime() + 60 * 60 * 1000);
        return endsAt && endsAt > now ? { lesson, startsAt } : null;
      })
      .filter(
        (item): item is { lesson: PortalLesson; startsAt: Date } =>
          item !== null,
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5);
  }, [queries]);

  const hasLessonsToday = useMemo(() => {
    const today = dateKey(new Date());
    return queries.some((query) => {
      const data = query.data as { lessons?: PortalLesson[] } | undefined;
      return data?.lessons?.some((lesson) => lesson.date === today) ?? false;
    });
  }, [queries]);

  const failedSources = queries.filter((query) => query.isError).length;
  return {
    lessons,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    failedSources,
    allSourcesFailed: failedSources === queries.length,
    hasLessonsToday,
    retry: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
