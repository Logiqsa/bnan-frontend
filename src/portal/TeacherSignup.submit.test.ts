import { describe, expect, it } from "vitest";
import {
  buildTeacherSignupFormData,
  validateFinalSnapshot,
  type TeacherSignupSubmitSnapshot,
} from "@/lib/teacherSignupSubmit";

const file = (name: string) => new File(["content"], name, { type: "application/pdf" });

const validSnapshot = (): TeacherSignupSubmitSnapshot => ({
  values: {
    fullName: "Teacher Name",
    email: "teacher@example.com",
    phone: "01000000000",
    termsAccepted: "true",
    dateOfBirth: "1990-01-01",
    whatsapp: "01000000000",
    nationality: "EG",
    country: "EG",
    city: "Cairo",
    degree: "bachelor",
    specialization: "Math",
    graduationYear: "2012",
    graduationGrade: "excellent",
    availableHoursPerWeek: "10",
    computerSkillLevel: "excellent",
    hasTeachingExperience: "false",
    hasOnlineTeachingExperience: "true",
    hasLaptop: "true",
    hasStableInternet: "true",
    hasGoodCamera: "true",
    hasMicrophone: "true",
    canProvideDemoSession: "true",
    introVideoUrl: "https://example.com/video",
    joiningReason: "Reason",
    weakStudentHandling: "Plan",
  },
  password: "CurrentPassword123!",
  selectedCurriculum: "curriculum-1",
  selectedGrades: ["grade-1"],
  assignments: { "grade-1": ["subject-1"] },
  additionalCurriculums: ["curriculum-2"],
  files: {
    cv: file("cv.pdf"),
    certificate: file("certificate.pdf"),
    identityDocument: file("identity.pdf"),
    stableInternetProof: file("internet.pdf"),
  },
  experienceCertificates: [],
});

describe("TeacherSignup final request hardening", () => {
  it("rejects incomplete fields, IDs, assignments, terms, password, and files before request", () => {
    const cases: TeacherSignupSubmitSnapshot[] = [
      { ...validSnapshot(), values: { ...validSnapshot().values, email: "" } },
      { ...validSnapshot(), password: "" },
      { ...validSnapshot(), values: { ...validSnapshot().values, termsAccepted: "false" } },
      { ...validSnapshot(), selectedCurriculum: "" },
      { ...validSnapshot(), selectedGrades: [] },
      { ...validSnapshot(), assignments: {} },
      { ...validSnapshot(), files: { ...validSnapshot().files, cv: null } },
    ];
    cases.forEach((snapshot) => expect(validateFinalSnapshot(snapshot)).not.toBeNull());
    expect(validateFinalSnapshot(validSnapshot())).toBeNull();
  });

  it("builds FormData from the allowlist only and emits no malformed literals", () => {
    const snapshot = validSnapshot();
    (snapshot.values as Record<string, unknown>).unknown = "must-not-be-sent";
    (snapshot.values as Record<string, unknown>).badObject = { unsafe: true };
    (snapshot.values as Record<string, unknown>).badNull = null;
    const body = buildTeacherSignupFormData(snapshot, snapshot.files, []);
    const keys = [...body.keys()];
    expect(keys).not.toContain("unknown");
    expect(keys).not.toContain("badObject");
    expect(keys).not.toContain("badNull");
    expect(JSON.parse(String(body.get("teacherAssignments")))).toEqual([
      { grade: "grade-1", subjects: ["subject-1"] },
    ]);
    for (const [, value] of body.entries()) {
      if (typeof value === "string") {
        expect(value).not.toBe("undefined");
        expect(value).not.toBe("null");
        expect(value).not.toBe("[object Object]");
      }
    }
  });
});
