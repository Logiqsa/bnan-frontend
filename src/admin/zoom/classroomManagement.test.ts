import { describe, expect, it } from "vitest";
import type { ClassroomOption } from "@/api/classroomRecordingsApi";
import { classroomZoomLabel, formatScheduleTime, normalizeEgyptianSchedule, normalizeGulfSchedule, sortClassroomsNewestFirst } from "./classroomManagement";

const item = (overrides: Partial<ClassroomOption> = {}): ClassroomOption => ({ id: "1", name: "Class", isActive: true, ...overrides });

describe("classroom management", () => {
  it("sorts classrooms newest first", () => {
    expect(sortClassroomsNewestFirst([item({ id: "old", createdAt: "2025-01-01" }), item({ id: "new", createdAt: "2026-01-01" })]).map((value) => value.id)).toEqual(["new", "old"]);
  });

  it("shows grade-default, complete legacy, provisioning and unlinked states", () => {
    expect(classroomZoomLabel(item({ zoomAssignmentMode: "grade_default" }))).toBe("ربط تلقائي");
    expect(classroomZoomLabel(item({ zoomAssignmentMode: "manual", zoomAccount: { id: "a" }, zoomMeetingId: "m", meetingLink: "url" }))).toBe("Zoom جاهز");
    expect(classroomZoomLabel(item({ zoomAssignmentMode: "manual", zoomProvisioning: { status: "creating" } }))).toBe("جاري إنشاء Zoom");
    expect(classroomZoomLabel(item({ zoomAssignmentMode: "manual" }))).toBe("Zoom غير مربوط");
  });

  it("normalizes Egyptian and Gulf schedules without fabricating end times", () => {
    expect(normalizeEgyptianSchedule({ days: [{ dayName: "sunday", lessons: [{ startTime: "10:00", subject: { name: "Math" } }] }] })[0]).toEqual({ day: "sunday", startTime: "10:00", subjectName: "Math" });
    expect(normalizeGulfSchedule({ schedule: [{ day: "monday", startTime: "12:00" }], subject: { name: { ar: "علوم" } } })[0].subjectName).toBe("علوم");
  });

  it("formats schedule times in Arabic 12-hour periods", () => {
    expect(formatScheduleTime("00:00")).toBe("12:00 صباحا");
    expect(formatScheduleTime("11:30")).toBe("11:30 صباحا");
    expect(formatScheduleTime("17:45")).toBe("5:45 مساءا");
    expect(formatScheduleTime("24:00")).toBe("12:00 صباحا");
    expect(formatScheduleTime("17:45", false)).toBe("5:45 PM");
  });
});
