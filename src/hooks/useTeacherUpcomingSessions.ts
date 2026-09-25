import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { coursesApi, type TeacherCourseAssignment } from "@/api/coursesApi";
import { getSchedule } from "@/api/scheduleApi";
import type { PortalLesson, RegistrationMode } from "@/api/types";

const courseDayNumbers: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const referenceId = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String(
          (value as { id?: string; _id?: string }).id ||
            (value as { _id?: string })._id ||
            "",
        )
      : "";

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

const courseLessons = (
  assignments: TeacherCourseAssignment[],
  weekStart: Date,
  registrationMode: RegistrationMode,
) => {
  const weekDates = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    return date;
  });

  return assignments.flatMap(({ course, groups }) =>
    groups.flatMap((group) => {
      const classroomId = referenceId(group.classroom);
      if (!classroomId || !group.schedule?.slots?.length) return [];
      const classroomName =
        typeof group.classroom === "object" ? group.classroom.name : undefined;

      return weekDates.flatMap((date) =>
        group.schedule!.slots.flatMap((slot, index): PortalLesson[] => {
          if (courseDayNumbers[slot.day] !== date.getDay()) return [];
          const day = dateKey(date);
          return [{
            key: `teacher-course-${course.id}-${group.id}-${day}-${slot.startTime}-${index}`,
            registrationMode,
            classroom: {
              id: classroomId,
              name: classroomName || group.name,
            },
            classroomSubjectId: "",
            subject: {
              id: referenceId(course.subject),
              name: course.name,
            },
            day: slot.day,
            date: day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            scheduledAt: null,
            activeSession:
              day === dateKey(new Date())
                ? (group.activeSession as PortalLesson["activeSession"])
                : null,
            scheduleKind: "course",
            courseName: course.name,
            courseId: course.id,
            courseGroupId: group.id,
          }];
        }),
      );
    }),
  );
};

export const useTeacherUpcomingSessions = (
  registrationModes?: RegistrationMode[],
) => {
  const modes = useMemo<RegistrationMode[]>(() => {
    const supported = (registrationModes || []).filter(
      (mode): mode is RegistrationMode =>
        mode === "egyptian" || mode === "gulf",
    );
    return [...new Set(supported.length ? supported : ["egyptian"])] as RegistrationMode[];
  }, [registrationModes]);
  const weekStartDate = useMemo(startOfCurrentWeek, []);
  const weekStart = dateKey(weekStartDate);
  const queries = useQueries({
    queries: [
      ...modes.map((mode) => ({
        queryKey: ["teacher-schedule", mode, weekStart] as const,
        queryFn: () => getSchedule(mode, weekStart),
        staleTime: 30_000,
        retry: 1,
      })),
      {
        queryKey: ["teacher-courses"] as const,
        queryFn: coursesApi.myTeachingCourses,
        staleTime: 30_000,
        retry: 1,
      },
    ],
  });

  const lessons = useMemo(() => {
    const unique = new Map<string, PortalLesson>();
    queries.slice(0, modes.length).forEach((query) => {
      const data = query.data as PortalLesson[] | undefined;
      data?.forEach((lesson) => unique.set(lesson.key, lesson));
    });
    const assignments = queries[modes.length]?.data as
      | TeacherCourseAssignment[]
      | undefined;
    if (assignments) {
      courseLessons(assignments, weekStartDate, modes[0]).forEach((lesson) =>
        unique.set(lesson.key, lesson),
      );
    }

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
  }, [modes, queries, weekStartDate]);

  const failedSources = queries.filter((query) => query.isError).length;
  return {
    lessons,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    failedSources,
    allSourcesFailed: failedSources === queries.length,
    retry: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
