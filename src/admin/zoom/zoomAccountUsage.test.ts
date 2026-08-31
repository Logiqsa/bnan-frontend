import { describe, expect, it } from "vitest";
import type { ZoomAccountClassroom } from "@/api/zoomAccountsApi";
import { buildUsageTimeline, filterUsageClassrooms, getMeetingStatus } from "./zoomAccountUsage";

const classroom = (overrides: Partial<ZoomAccountClassroom> = {}): ZoomAccountClassroom => ({
  id: "classroom-1", name: "فصل أ", isActive: true, zoomAssignmentMode: "grade_default",
  curriculum: { id: "curriculum-1", name: "مصري", registrationMode: "egyptian" },
  grade: { id: "grade-1", name: "ثالث ابتدائي" }, zoomMeetingId: null, meetingLink: null,
  zoomProvisioning: null, createdAt: "2026-01-01", schedule: [], ...overrides,
});

describe("Zoom account usage", () => {
  it("uses provisioning errors before meeting ownership readiness", () => {
    expect(getMeetingStatus(classroom({ zoomMeetingId: "1", meetingLink: "https://zoom.us", zoomProvisioning: { status: "failed" } }))).toBe("failed");
    expect(getMeetingStatus(classroom({ zoomProvisioning: { status: "creating" } }))).toBe("creating");
    expect(getMeetingStatus(classroom({ zoomMeetingId: "1", meetingLink: "https://zoom.us" }))).toBe("ready");
    expect(getMeetingStatus(classroom())).toBe("not_ready");
  });

  it("supports assignment and activity filters without hiding inactive history by default", () => {
    const items = [classroom(), classroom({ id: "2", isActive: false, zoomAssignmentMode: "manual" })];
    expect(filterUsageClassrooms(items, "all")).toHaveLength(2);
    expect(filterUsageClassrooms(items, "manual").map((item) => item.id)).toEqual(["2"]);
    expect(filterUsageClassrooms(items, "inactive").map((item) => item.id)).toEqual(["2"]);
  });

  it("groups normalized schedules by weekday and sorts by start time", () => {
    const timeline = buildUsageTimeline([
      classroom({ schedule: [{ day: "tuesday", startTime: "18:00", endTime: null, subjectId: "1", subjectName: "English" }] }),
      classroom({ id: "2", schedule: [{ day: "sunday", startTime: "14:00", endTime: "15:00", subjectId: "2", subjectName: "Math" }, { day: "sunday", startTime: "10:00", endTime: "11:00", subjectId: "3", subjectName: "Science" }] }),
    ]);
    expect(timeline.map((group) => group.day)).toEqual(["sunday", "tuesday"]);
    expect(timeline[0].entries.map((entry) => entry.startTime)).toEqual(["10:00", "14:00"]);
    expect(timeline[1].entries[0].endTime).toBeNull();
  });
});
