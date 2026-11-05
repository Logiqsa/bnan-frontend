import type { CourseScheduleSlot } from "@/api/coursesApi";
import type { SupportedTimeZone } from "@/contexts/TimeZoneContext";

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const parts = (value: Date, timeZone: string) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, calendar: "gregory", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(value).map((item) => [item.type, item.value]));
const localToUtc = (date: string, time: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const intended = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(intended);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = parts(result, timeZone);
    const offset = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second)) - result.getTime();
    result = new Date(intended - offset);
  }
  return result;
};

export const weeklySlotOccurrence = (slot: CourseScheduleSlot, sourceTimeZone: string, now = new Date()) => {
  const today = parts(now, sourceTimeZone);
  const date = `${today.year}-${today.month}-${today.day}`;
  const start = localToUtc(date, slot.startTime, sourceTimeZone);
  const end = slot.endTime ? localToUtc(date, slot.endTime, sourceTimeZone) : new Date(start.getTime() + 60 * 60 * 1000);
  const isToday = String(today.weekday).toLowerCase() === slot.day;
  const phase = !isToday ? "other" as const : now < start ? "upcoming" as const : now > end ? "ended" as const : "ready" as const;
  return { date, start, end, phase };
};

export const displayWeeklySlot = (slot: CourseScheduleSlot, sourceTimeZone: string, viewerTimeZone: SupportedTimeZone, now = new Date()) => {
  if (sourceTimeZone === viewerTimeZone) return slot;
  const today = parts(now, sourceTimeZone);
  const sourceDay = weekdays.indexOf(slot.day as typeof weekdays[number]);
  const currentDay = weekdays.indexOf(String(today.weekday).toLowerCase() as typeof weekdays[number]);
  const date = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) + ((sourceDay - currentDay + 7) % 7)));
  const dateKey = date.toISOString().slice(0, 10);
  const start = parts(localToUtc(dateKey, slot.startTime, sourceTimeZone), viewerTimeZone);
  const end = slot.endTime ? parts(localToUtc(dateKey, slot.endTime, sourceTimeZone), viewerTimeZone) : null;
  return {
    ...slot,
    day: String(start.weekday).toLowerCase() as CourseScheduleSlot["day"],
    startTime: `${start.hour}:${start.minute}`,
    ...(end ? { endTime: `${end.hour}:${end.minute}` } : {}),
  };
};
