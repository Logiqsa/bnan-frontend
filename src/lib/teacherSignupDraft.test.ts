import { beforeEach, describe, expect, it } from "vitest";
import {
  restoreTeacherSignupDraft,
  serializeTeacherSignupDraft,
  TEACHER_SIGNUP_DRAFT_KEY,
  TEACHER_SIGNUP_DRAFT_TTL_MS,
  TEACHER_SIGNUP_DRAFT_VERSION,
} from "./teacherSignupDraft";

const validData = () => ({
  idempotencyKey: "request-id",
  step: 3,
  curriculumStage: "subjects" as const,
  values: { fullName: "Teacher", email: "teacher@example.com" },
  selectedCurriculum: "curriculum-1",
  selectedGrades: ["grade-1"],
  assignments: { "grade-1": ["subject-1"] },
  activeGrade: "grade-1",
  additionalCurriculums: ["curriculum-2"],
});

describe("teacher signup draft normalization", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("safely ignores and removes malformed JSON", () => {
    sessionStorage.setItem(TEACHER_SIGNUP_DRAFT_KEY, "{broken");
    expect(restoreTeacherSignupDraft().values).toEqual({});
    expect(sessionStorage.getItem(TEACHER_SIGNUP_DRAFT_KEY)).toBeNull();
  });

  it("normalizes wrong field types and supplies defaults for missing fields", () => {
    sessionStorage.setItem(TEACHER_SIGNUP_DRAFT_KEY, JSON.stringify({
      version: TEACHER_SIGNUP_DRAFT_VERSION,
      savedAt: Date.now(),
      data: {
        values: { fullName: 123, email: "valid@example.com", password: "secret" },
        selectedGrades: "grade-1",
        assignments: null,
        additionalCurriculums: ["curriculum-2", 42],
      },
    }));
    expect(restoreTeacherSignupDraft()).toMatchObject({
      step: 0,
      curriculumStage: "grades",
      values: { email: "valid@example.com" },
      selectedGrades: [],
      assignments: {},
      additionalCurriculums: ["curriculum-2"],
    });
  });

  it("removes expired drafts", () => {
    sessionStorage.setItem(
      TEACHER_SIGNUP_DRAFT_KEY,
      serializeTeacherSignupDraft(validData(), Date.now() - TEACHER_SIGNUP_DRAFT_TTL_MS - 1),
    );
    expect(restoreTeacherSignupDraft().idempotencyKey).toBe("");
    expect(sessionStorage.getItem(TEACHER_SIGNUP_DRAFT_KEY)).toBeNull();
  });

  it("removes drafts from incompatible versions", () => {
    sessionStorage.setItem(TEACHER_SIGNUP_DRAFT_KEY, JSON.stringify({
      version: TEACHER_SIGNUP_DRAFT_VERSION + 1,
      savedAt: Date.now(),
      data: validData(),
    }));
    expect(restoreTeacherSignupDraft().idempotencyKey).toBe("");
    expect(sessionStorage.getItem(TEACHER_SIGNUP_DRAFT_KEY)).toBeNull();
  });

  it("ignores unknown value and top-level keys", () => {
    const raw = JSON.parse(serializeTeacherSignupDraft(validData()));
    raw.data.unknown = "not-allowed";
    raw.data.values.admin = "true";
    sessionStorage.setItem(TEACHER_SIGNUP_DRAFT_KEY, JSON.stringify(raw));
    const restored = restoreTeacherSignupDraft() as unknown as Record<string, unknown>;
    expect(restored.unknown).toBeUndefined();
    expect((restored.values as Record<string, unknown>).admin).toBeUndefined();
  });
});
