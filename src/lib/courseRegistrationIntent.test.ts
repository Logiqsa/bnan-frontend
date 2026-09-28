import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  courseRegistrationIntentStore,
  canResumeCourseRegistration,
  isCourseRegistrationIntent,
} from "./courseRegistrationIntent";

const storageKey = "bnan_course_registration_intent";

describe("course registration intent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("persists only the safe course registration selections", () => {
    courseRegistrationIntentStore.save({
      courseId: "course-1",
      mode: "individual",
      provider: "paymob",
      returnTo: "/courses/course-1?continueRegistration=1",
    });

    const raw = localStorage.getItem(storageKey) || "";
    expect(raw).toContain("course-1");
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("token");
    expect(courseRegistrationIntentStore.read()).toMatchObject({
      courseId: "course-1",
      mode: "individual",
      provider: "paymob",
    });
  });

  it("binds an intent to the newly created student and tracks a started payment", () => {
    courseRegistrationIntentStore.save({
      courseId: "course-1",
      mode: "group",
      provider: "tamara",
      returnTo: "/courses/course-1?continueRegistration=1",
    });

    expect(courseRegistrationIntentStore.bindStudent("student-user-1"))
      .toMatchObject({ expectedStudentUserId: "student-user-1" });
    expect(courseRegistrationIntentStore.markPaymentStarted())
      .toMatchObject({ paymentStarted: true });
  });

  it("never resumes an intent under a different logged-in student", () => {
    const intent = {
      courseId: "course-1",
      mode: "group" as const,
      provider: "paymob" as const,
      returnTo: "/courses/course-1?continueRegistration=1",
      createdAt: Date.now(),
      expectedStudentUserId: "student-user-1",
    };

    expect(canResumeCourseRegistration(intent, "course-1", "student-user-1")).toBe(true);
    expect(canResumeCourseRegistration(intent, "course-1", "student-user-2")).toBe(false);
  });

  it("rejects and clears expired, malformed, or untrusted intents", () => {
    localStorage.setItem(storageKey, JSON.stringify({
      courseId: "course-1",
      mode: "group",
      provider: "paymob",
      returnTo: "/courses/course-1?continueRegistration=1",
      createdAt: Date.now() - (25 * 60 * 60 * 1000),
    }));
    expect(courseRegistrationIntentStore.read()).toBeNull();

    const untrusted = {
      courseId: "course-1",
      mode: "group",
      provider: "paymob",
      returnTo: "/courses/course-1?continueRegistration=1",
      createdAt: Date.now(),
      accessToken: "secret",
    };
    expect(isCourseRegistrationIntent(untrusted)).toBe(false);
  });
});
