import type { GradeOption, SubjectOption } from "@/api/catalogApi";
import { normalizeGradeName } from "@/lib/gradeStages";

const trackWords = /(?:عرب[يى]|لغات|languages?|language|مشترك(?:ة)?|shared)/giu;
export const teacherGradeBaseName = (value: string) => normalizeGradeName(value)
  .replace(trackWords, " ")
  .replace(/[\s\-_–—]+/g, " ")
  .trim();

export const isSharedTeacherGrade = (value: string) => /(?:مشترك(?:ة)?|shared)/iu.test(normalizeGradeName(value));

export const sharedCompanionGrade = (grade: GradeOption, grades: GradeOption[]) => {
  const base = teacherGradeBaseName(grade.name);
  if (!base || isSharedTeacherGrade(grade.name)) return undefined;
  return grades.find((candidate) => isSharedTeacherGrade(candidate.name) && teacherGradeBaseName(candidate.name) === base);
};

export const mergeUniqueSubjects = (...groups: SubjectOption[][]) =>
  [...new Map(groups.flat().map((subject) => [subject.id, subject])).values()];
