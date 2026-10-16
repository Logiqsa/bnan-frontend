import type { CourseScheduleSlot } from "@/api/coursesApi";

export type EditableCourseScheduleSlot = CourseScheduleSlot & { clientKey: string };

export const toEditableCourseScheduleSlots = (slots: CourseScheduleSlot[]): EditableCourseScheduleSlot[] =>
  slots.map((slot) => ({ ...slot, clientKey: slot.slotId || crypto.randomUUID() }));

export const newEditableCourseScheduleSlot = (
  defaults: Omit<CourseScheduleSlot, "slotId">,
): EditableCourseScheduleSlot => ({ ...defaults, clientKey: crypto.randomUUID() });

export const serializeCourseScheduleSlots = (
  slots: EditableCourseScheduleSlot[],
): CourseScheduleSlot[] => slots.map(({ clientKey: _clientKey, slotId, day, startTime, endTime }) => ({
  ...(slotId ? { slotId } : {}), day, startTime, ...(endTime ? { endTime } : {}),
}));

export const hasLegacyCourseScheduleSlots = (slots: CourseScheduleSlot[]) =>
  slots.some((slot) => !slot.slotId);
