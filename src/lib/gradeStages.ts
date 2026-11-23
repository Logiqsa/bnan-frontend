export type WebsiteGradeStage = "kindergarten" | "primary" | "preparatory" | "secondary" | "other";

export const normalizeGradeName = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u064B-\u065F\u0670]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .toLocaleLowerCase("ar");

export const websiteStageForGrade = (value: string): WebsiteGradeStage => {
  const name = normalizeGradeName(value);
  if (/(?:رياض\s*(?:ال)?اطفال|روضه|روضة|حضان|تمهيد|pre[\s-]?k|kindergarten|\bkg\s*[0-9]*\b)/iu.test(name)) return "kindergarten";
  if (/ابتدا/u.test(name)) return "primary";
  if (/(?:اعداد|متوسط)/u.test(name)) return "preparatory";
  if (/ثانو/u.test(name)) return "secondary";
  return "other";
};

export const websiteGradeStages = [
  { key: "kindergarten", ar: "رياض الأطفال", en: "Kindergarten" },
  { key: "primary", ar: "المرحلة الابتدائية", en: "Primary" },
  { key: "preparatory", ar: "المرحلة الإعدادية / المتوسطة", en: "Preparatory / Middle" },
  { key: "secondary", ar: "المرحلة الثانوية", en: "Secondary" },
  { key: "other", ar: "أخرى", en: "Other" },
] as const;

export const groupGradesByWebsiteStage = <T extends { id: string; name: string }>(grades: T[]) =>
  websiteGradeStages
    .map((stage) => ({ ...stage, grades: grades.filter((grade) => websiteStageForGrade(grade.name) === stage.key) }))
    .filter((stage) => stage.grades.length > 0);
