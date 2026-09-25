import { describe, expect, it } from "vitest";
import { safeSignupDraft } from "./StudentSignup";

describe("StudentSignup draft security", () => {
  it("keeps only non-sensitive draft fields", () => {
    const safe = safeSignupDraft({
      step: 2,
      parentEmail: "parent@example.com",
      parentPassword: "parent-secret",
      parentCreds: { email: "parent@example.com", password: "parent-secret" },
      studentEmail: "student@example.com",
      studentPassword: "student-secret",
      curriculumId: "curriculum-1",
    } as never);

    expect(safe).toEqual(expect.objectContaining({
      step: 2,
      parentEmail: "parent@example.com",
      studentEmail: "student@example.com",
      curriculumId: "curriculum-1",
    }));
    expect(JSON.stringify(safe)).not.toContain("parent-secret");
    expect(JSON.stringify(safe)).not.toContain("student-secret");
    expect(safe).not.toHaveProperty("parentPassword");
    expect(safe).not.toHaveProperty("studentPassword");
    expect(safe).not.toHaveProperty("parentCreds");
  });
});
