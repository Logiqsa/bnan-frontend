import { describe, expect, it } from "vitest";
import { sharedGradeBaseName, sharedTargetScore, type SharedTarget } from "./SharedClassroomCreateCard";

const target = (grade: string, gradeName: string): SharedTarget => ({
  curriculum: "curriculum-1",
  curriculumName: "المنهج المصري",
  grade,
  gradeName,
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
