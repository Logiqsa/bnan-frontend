import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import {
  endSession,
  getActiveClassroomSession,
  getSchedule,
  getScheduleWeek,
  normalizeGulfSchedule,
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

  it("keeps the Egyptian response parsing unchanged", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: { weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo", days: [{ dayName: "saturday", lessons: [{
      id: "lesson-1", date: "2026-09-19", startTime: "09:00", scheduledAt: "2026-09-19T06:00:00.000Z",
      classroom: { id: "classroom-1", name: "Egyptian class" }, classroomSubjectId: "assignment-1",
      subject: { id: "subject-1", name: "Arabic" },
    }] }] } });

    await expect(getSchedule("egyptian", "2026-09-19")).resolves.toMatchObject([{ lessonId: "lesson-1", date: "2026-09-19" }]);
    expect(apiRequest).toHaveBeenCalledWith("/egyptianSchedules/mySchedule?weekStart=2026-09-19");
  });

  it("exposes backend week metadata without changing lesson parsing", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: { currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo", days: [] } });
    await expect(getScheduleWeek("egyptian", "2026-09-19")).resolves.toEqual({ currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo", lessons: [] });
  });

  it("normalizes the sole Student Gulf classroom collection and preserves session fields", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: {
      currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19",
      weekEnd: "2026-09-25", timezone: "Africa/Cairo",
      students: [{ student: { id: "student-1", fullName: "Student" }, classrooms: [{
        id: "classroom-1", name: "Classroom", classroomSubject: "assignment-1",
        grade: { id: "grade-1", name: "Grade" }, curriculum: { id: "curriculum-1", name: "Gulf" },
        subject: { id: "subject-1", name: "Subject" }, hasSubjectConflict: false,
        schedule: { id: "schedule-1", classroomSubject: "assignment-1", isActive: true,
          createdAt: "2026-09-01", updatedAt: "2026-09-02", entries: [{ _id: "entry-1", day: "saturday", startTime: "10:00", endTime: "11:00", activeSession: {
            sessionId: "session-1", status: "ended", canJoin: false, classroomId: "classroom-1",
            subjectId: "subject-1", classroomSubjectId: "assignment-1", occurrenceKey: "gulf:key",
            chatRoomId: "room-1", recordingUrl: "https://example.com/recording", summaryUrl: "https://example.com/summary",
          } }] },
      }] }],
    } });
    const lessons = await getSchedule("gulf", "2026-09-19");
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({ classroom: { id: "classroom-1" }, classroomSubjectId: "assignment-1", endTime: "11:00" });
    expect(lessons[0].activeSession).toEqual({
      id: "session-1", sessionId: "session-1", status: "ended", canJoin: false,
      classroomId: "classroom-1", subjectId: "subject-1", classroomSubjectId: "assignment-1",
      occurrenceKey: "gulf:key", chatRoomId: "room-1", recordingUrl: "https://example.com/recording",
      summaryUrl: "https://example.com/summary",
    });
  });

  it("preserves Gulf week metadata and the complete nested classroom schedule", () => {
    const data = { currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo", students: [{ student: { id: "student-1", fullName: "Student" }, classrooms: [{ id: "classroom-1", name: "Classroom", classroomSubject: "assignment-1", subject: { id: "subject-1", name: "Subject" }, schedule: { id: "schedule-1", classroomSubject: "assignment-1", entries: [{ _id: "entry-1", day: "saturday", startTime: "10:00", activeSession: null }], isActive: true } }] }] };
    const normalized = normalizeGulfSchedule(data);
    expect(normalized).toMatchObject({ currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo" });
    expect(normalized.classrooms[0].schedule).toEqual(data.students[0].classrooms[0].schedule);
  });

  it("does not rely on the obsolete top-level classrooms shape for a Student response", () => {
    const normalized = normalizeGulfSchedule({
      weekStart: "2026-09-19",
      students: [{ student: { id: "student-1", fullName: "Student" }, classrooms: [{ id: "student-classroom", name: "Student classroom", classroomSubject: null, subject: null, schedule: null }] }],
      classrooms: [{ id: "obsolete-classroom", name: "Obsolete", classroomSubject: null, subject: null, schedule: null }],
    });
    expect(normalized.classrooms.map((room) => room.id)).toEqual(["student-classroom"]);
  });

  it("does not merge or select arbitrary classrooms when multiple Student records are returned", () => {
    const normalized = normalizeGulfSchedule({ weekStart: "2026-09-19", students: [
      { student: { id: "student-1", fullName: "One" }, classrooms: [{ id: "classroom-1", name: "One", classroomSubject: null, subject: null, schedule: null }] },
      { student: { id: "student-2", fullName: "Two" }, classrooms: [{ id: "classroom-2", name: "Two", classroomSubject: null, subject: null, schedule: null }] },
    ] });
    expect(normalized.classrooms).toEqual([]);
  });
});
