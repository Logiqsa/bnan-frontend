export type EgyptianGradeLanguage = "languages" | "arabic";

// Shared with registration: language is derived from the Grade name, not a backend field.
export const egyptianGradeLanguage = (
  gradeName: string,
): EgyptianGradeLanguage | null => {
  if (gradeName.includes("لغات")) return "languages";
  if (gradeName.includes("عربي") || gradeName.includes("عربى")) return "arabic";
  return null;
};
