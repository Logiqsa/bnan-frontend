import { describe, expect, it } from "vitest";
import { isSharedTeacherGrade, mergeUniqueSubjects, sharedCompanionGrade, teacherGradeBaseName } from "./teacherGradeSubjects";

const grade = (id: string, name: string) => ({ id, name, isActive: true });

describe("teacher grade subject visibility", () => {
  it("matches Arabic and languages grades to the hidden shared grade", () => {
    const grades = [grade("ar", "أول ابتدائي عربي"), grade("lang", "أول ابتدائي لغات"), grade("shared", "أول ابتدائي مشترك")];
    expect(sharedCompanionGrade(grades[0], grades)?.id).toBe("shared");
    expect(sharedCompanionGrade(grades[1], grades)?.id).toBe("shared");
    expect(isSharedTeacherGrade(grades[2].name)).toBe(true);
    expect(teacherGradeBaseName(grades[0].name)).toBe(teacherGradeBaseName(grades[2].name));
  });

  it("deduplicates subjects from the selected and shared grades", () => {
    expect(mergeUniqueSubjects([{ id: "arabic", name: "عربي" }, { id: "common", name: "حاسب" }], [{ id: "common", name: "حاسب" }]).map((item) => item.id)).toEqual(["arabic", "common"]);
  });
});
