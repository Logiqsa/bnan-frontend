import { describe, expect, it } from "vitest";
import type { ClassroomOption } from "@/api/classroomRecordingsApi";
import { classroomZoomLabel, formatScheduleTime, sortClassroomsNewestFirst } from "./classroomManagement";

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

  it("formats schedule times in Arabic 12-hour periods", () => {
    expect(formatScheduleTime("00:00")).toBe("12:00 صباحا");
    expect(formatScheduleTime("11:30")).toBe("11:30 صباحا");
    expect(formatScheduleTime("17:45")).toBe("5:45 مساءا");
    expect(formatScheduleTime("24:00")).toBe("12:00 صباحا");
    expect(formatScheduleTime("17:45", false)).toBe("5:45 PM");
  });
});
