import { describe, expect, it } from "vitest";
import { courseError } from "./courseUi";

const codes = [
  "COURSE_SCHEDULE_LEGACY_SLOT_IDS_REQUIRED",
  "COURSE_SCHEDULE_CONCURRENT_UPDATE",
  "COURSE_SCHEDULE_SLOT_ID_INVALID",
  "COURSE_SCHEDULE_SLOT_ID_DUPLICATE",
  "COURSE_SCHEDULE_SLOT_ID_UNKNOWN",
  "COURSE_SCHEDULE_SLOT_ID_FOREIGN",
  "COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS",
  "COURSE_SCHEDULE_SLOT_ID_NOT_ALLOWED_FOR_NEW_SCHEDULE",
];

describe("course schedule identity errors", () => {
  it.each(codes)("maps %s to a specific Arabic message", (code) => {
    const message = courseError({ code, message: "raw backend message" });
    expect(message).not.toBe("raw backend message");
    expect(message.length).toBeGreaterThan(20);
  });

  it("maps weekly allocation readiness errors to Arabic feedback", () => {
    expect(courseError({ code: "WEEKLY_ZOOM_ASSIGNMENT_PENDING" })).toContain("يجري تخصيص");
    expect(courseError({ code: "WEEKLY_ZOOM_HOST_BUSY" })).toContain("مستخدم");
    expect(courseError({ code: "WEEKLY_ZOOM_ASSIGNMENT_QUARANTINED" })).toContain("للتحقق الآمن");
  });
});
