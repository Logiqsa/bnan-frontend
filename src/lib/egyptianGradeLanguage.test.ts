import { describe, expect, it } from "vitest";
import { egyptianGradeLanguage } from "./egyptianGradeLanguage";

describe("egyptianGradeLanguage", () => {
  it("matches the existing registration naming convention", () => {
    expect(egyptianGradeLanguage("الصف الأول لغات")).toBe("languages");
    expect(egyptianGradeLanguage("الصف الأول عربي")).toBe("arabic");
    expect(egyptianGradeLanguage("الصف الأول عربى")).toBe("arabic");
    expect(egyptianGradeLanguage("الصف الأول")).toBeNull();
  });
});
