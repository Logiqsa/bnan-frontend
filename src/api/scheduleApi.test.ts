import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import {
  deleteUnifiedScheduleEntry,
  endSession,
  getActiveClassroomSession,
  getUnifiedClassroomSchedule,
  getUnifiedScheduleWeek,
  reconcileUnifiedClassroomSchedule,
  startClassroomSession,
} from "./scheduleApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("regular session lifecycle API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the real session ID and no request body to request ending", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "session-1", status: "awaiting_zoom_end" } });
    await expect(endSession("session-1")).resolves.toMatchObject({ status: "awaiting_zoom_end" });
    expect(apiRequest).toHaveBeenCalledWith("/sessions/session-1/end", { method: "POST" });
  });

  it("reads the active session by classroom ID", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { sessionId: "session-1", status: "live" } });
    await expect(getActiveClassroomSession("classroom-1")).resolves.toMatchObject({ sessionId: "session-1" });
    expect(apiRequest).toHaveBeenCalledWith("/classrooms/classroom-1/sessions/active");
  });

  it("starts the classroom occurrence using the subject assignment from the active-session contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { session: { _id: "session-1", status: "starting" }, meetingLink: "https://zoom.example/join" },
    });

    await startClassroomSession("classroom-1", {
      classroomSubjectId: "assignment-1",
      subjectId: "subject-1",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/classrooms/classroom-1/sessions/start",
      {
        method: "POST",
        body: JSON.stringify({ subjectId: "subject-1", classroomSubjectId: "assignment-1" }),
      },
    );
  });

  it("uses the unified schedule route and preserves merged classroom and course lessons", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: {
      weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo",
      days: [{ date: "2026-09-19", day: "saturday", lessons: [
        { id: "entry-1", type: "classroom", system: "gulf", classroom: { id: "classroom-1", name: "Class" }, classroomSubjectId: "subject-1", subject: { id: "subject-1", name: "Math" }, day: "saturday", date: "2026-09-19", startTime: "09:00", scheduledAt: "2026-09-19T06:00:00.000Z", activeSession: null },
        { id: "course:schedule-1:saturday:10:00", type: "course", system: "gulf", classroom: { id: "course-class-1", name: "Course class" }, subject: { id: "course-1", name: "Course" }, courseId: "course-1", courseName: "Course", day: "saturday", date: "2026-09-19", startTime: "10:00", scheduledAt: "2026-09-19T07:00:00.000Z", activeSession: null },
      ] }],
    } });
    const week = await getUnifiedScheduleWeek("2026-09-19");
    expect(apiRequest).toHaveBeenCalledWith("/schedules/mySchedule?weekStart=2026-09-19");
    expect(week.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ scheduleKind: "classroom", scheduleEntryId: "entry-1" }),
      expect.objectContaining({ scheduleKind: "course", courseId: "course-1" }),
    ]));
  });

  it("keeps teacher registration-mode filtering on the unified schedule route", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: {
      weekStart: "2026-09-19", weekEnd: "2026-09-25", days: [],
    } });

    await getUnifiedScheduleWeek("2026-09-19", "gulf");

    expect(apiRequest).toHaveBeenCalledWith(
      "/schedules/mySchedule?weekStart=2026-09-19&registrationMode=gulf",
    );
  });

  it("reads a classroom schedule from the unified route with stable entry IDs", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: {
      weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo",
      days: [{ date: "2026-09-19", day: "saturday", lessons: [{
        id: "entry-1", type: "classroom", system: "egyptian", classroom: { id: "classroom-1", name: "Class" }, classroomSubjectId: "assignment-1", subject: { id: "subject-1", name: "Arabic" }, day: "saturday", date: "2026-09-19", startTime: "09:00", endTime: "10:00", scheduledAt: "2026-09-19T06:00:00.000Z", activeSession: null,
      }] }],
    } });

    await expect(getUnifiedClassroomSchedule("classroom-1")).resolves.toMatchObject({
      timezone: "Africa/Cairo",
      entries: [{ id: "entry-1", classroomSubjectId: "assignment-1", subjectName: "Arabic" }],
    });
    expect(apiRequest).toHaveBeenCalledWith("/schedules/classroom/classroom-1");
  });

  it("reconciles classroom entries through targeted unified PUT and DELETE requests", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "entry-2", system: "gulf", classroomId: "classroom-1" } });
    await reconcileUnifiedClassroomSchedule(
      "classroom-1",
      [
        { id: "removed-entry", day: "saturday", startTime: "09:00", endTime: "10:00", classroomSubjectId: "subject-1" },
        { id: "updated-entry", day: "sunday", startTime: "10:00", endTime: "11:00", classroomSubjectId: "subject-1" },
      ],
      [
        { id: "updated-entry", day: "sunday", startTime: "11:00", endTime: "12:00", classroomSubjectId: "subject-1" },
        { day: "monday", startTime: "12:00", endTime: "13:00", classroomSubjectId: "subject-1" },
      ],
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/schedules/classroom/classroom-1/entries/removed-entry",
      { method: "DELETE" },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/schedules/classroom/classroom-1",
      { method: "PUT", body: JSON.stringify({ day: "sunday", classroomSubjectId: "subject-1", startTime: "11:00", endTime: "12:00" }) },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/schedules/classroom/classroom-1",
      { method: "PUT", body: JSON.stringify({ day: "monday", classroomSubjectId: "subject-1", startTime: "12:00", endTime: "13:00" }) },
    );
  });

  it("deletes a single schedule entry through the unified route", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: undefined });
    await deleteUnifiedScheduleEntry("classroom-1", "entry-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/schedules/classroom/classroom-1/entries/entry-1",
      { method: "DELETE" },
    );
  });
});
