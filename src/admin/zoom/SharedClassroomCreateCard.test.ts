import { describe, expect, it } from "vitest";
import { schoolGradeOrder, schoolStageForGrade, sharedGradeBaseName, sharedTargetScore, type SharedTarget } from "./SharedClassroomCreateCard";

const target = (grade: string, gradeName: string): SharedTarget => ({
  curriculum: "curriculum-1",
  curriculumName: "المنهج المصري",
  grade,
  gradeName,
});

describe("shared classroom grade ordering", () => {
  it("recognizes school stages including Arabic hamza variants", () => {
    expect(schoolStageForGrade("أولى ابتدائي - عربي")).toBe("primary");
    expect(schoolStageForGrade("ثالث إعدادي - لغات")).toBe("preparatory");
    expect(schoolStageForGrade("ثانية ثانوي علمي - عربي")).toBe("secondary");
  });

  it("sorts grade years in their educational order", () => {
    expect(schoolGradeOrder("أولى ابتدائي")).toBe(1);
    expect(schoolGradeOrder("ثاني إعدادي")).toBe(2);
    expect(schoolGradeOrder("سادس ابتدائي")).toBe(6);
  });
});

describe("shared classroom suggestions", () => {
  it("suggests the other stream for the same named grade", () => {
    const arabic = target("arabic", "أولى ابتدائي - عربي");
    const languages = target("languages", "أولى ابتدائي - لغات");
    const unrelated = target("unrelated", "ثانية ابتدائي - لغات");

    expect(sharedGradeBaseName(arabic.gradeName)).toBe("أولى ابتدائي");
    expect(sharedTargetScore(arabic, languages)).toBeGreaterThan(sharedTargetScore(arabic, unrelated));
  });
});
