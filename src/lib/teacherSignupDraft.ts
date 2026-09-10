export const TEACHER_SIGNUP_DRAFT_KEY = "bnan_teacher_signup_draft";
export const TEACHER_SIGNUP_PERSISTENT_DRAFT_KEY = "bnan_teacher_signup_persistent_draft";
export const TEACHER_SIGNUP_DRAFT_VERSION = 1;
export const TEACHER_SIGNUP_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const TEACHER_SIGNUP_VALUE_FIELDS = [
  "fullName",
  "email",
  "phone",
  "termsAccepted",
  "dateOfBirth",
  "whatsapp",
  "nationality",
  "country",
  "city",
  "degree",
  "specialization",
  "graduationYear",
  "graduationGrade",
  "availableHoursPerWeek",
  "computerSkillLevel",
  "hasTeachingExperience",
  "hasOnlineTeachingExperience",
  "hasLaptop",
  "hasStableInternet",
  "hasGoodCamera",
  "hasMicrophone",
  "canProvideDemoSession",
  "introVideoUrl",
  "joiningReason",
  "weakStudentHandling",
] as const;

export type TeacherSignupValueField = typeof TEACHER_SIGNUP_VALUE_FIELDS[number];
export type TeacherSignupValues = Partial<Record<TeacherSignupValueField, string>>;

export interface TeacherSignupDraftData {
  idempotencyKey: string;
  step: number;
  curriculumStage: "grades" | "subjects";
  values: TeacherSignupValues;
  selectedCurriculum: string;
  selectedGrades: string[];
  assignments: Record<string, string[]>;
  activeGrade: string | null;
  additionalCurriculums: string[];
}

interface TeacherSignupDraftEnvelope {
  version: number;
  savedAt: number;
  data: TeacherSignupDraftData;
}

export const emptyTeacherSignupDraft = (): TeacherSignupDraftData => ({
  idempotencyKey: "",
  step: 0,
  curriculumStage: "grades",
  values: {},
  selectedCurriculum: "",
  selectedGrades: [],
  assignments: {},
  activeGrade: null,
  additionalCurriculums: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const stringArray = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
  : [];

const normalizeData = (value: unknown): TeacherSignupDraftData => {
  const raw = isRecord(value) ? value : {};
  const rawValues = isRecord(raw.values) ? raw.values : {};
  const values: TeacherSignupValues = {};
  TEACHER_SIGNUP_VALUE_FIELDS.forEach((field) => {
    if (typeof rawValues[field] === "string") values[field] = rawValues[field];
  });
  // Defense in depth for drafts created by older clients.
  delete (values as Record<string, string | undefined>).password;

  const selectedGrades = stringArray(raw.selectedGrades);
  const selectedGradeSet = new Set(selectedGrades);
  const rawAssignments = isRecord(raw.assignments) ? raw.assignments : {};
  const assignments: Record<string, string[]> = {};
  selectedGrades.forEach((gradeId) => {
    const subjects = stringArray(rawAssignments[gradeId]);
    if (subjects.length) assignments[gradeId] = subjects;
  });

  const rawStep = typeof raw.step === "number" && Number.isInteger(raw.step) ? raw.step : 0;
  const activeGrade = typeof raw.activeGrade === "string" && selectedGradeSet.has(raw.activeGrade)
    ? raw.activeGrade
    : null;

  return {
    idempotencyKey: stringValue(raw.idempotencyKey),
    step: Math.min(Math.max(rawStep, 0), 3),
    curriculumStage: raw.curriculumStage === "subjects" ? "subjects" : "grades",
    values,
    selectedCurriculum: stringValue(raw.selectedCurriculum),
    selectedGrades,
    assignments,
    activeGrade,
    additionalCurriculums: stringArray(raw.additionalCurriculums),
  };
};

export const serializeTeacherSignupDraft = (
  data: TeacherSignupDraftData,
  savedAt = Date.now(),
) => JSON.stringify({
  version: TEACHER_SIGNUP_DRAFT_VERSION,
  savedAt,
  data: normalizeData(data),
} satisfies TeacherSignupDraftEnvelope);

const parseTeacherSignupDraft = (raw: string, now: number): TeacherSignupDraftData | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)
    || parsed.version !== TEACHER_SIGNUP_DRAFT_VERSION
    || typeof parsed.savedAt !== "number"
    || !Number.isFinite(parsed.savedAt)
    || parsed.savedAt > now + 60_000
    || now - parsed.savedAt > TEACHER_SIGNUP_DRAFT_TTL_MS
    || !isRecord(parsed.data)) {
    return null;
  }
  return normalizeData(parsed.data);
};

export const restoreTeacherSignupDraft = (now = Date.now()): TeacherSignupDraftData => {
  const candidates: Array<[Storage, string]> = [
    [sessionStorage, TEACHER_SIGNUP_DRAFT_KEY],
    [localStorage, TEACHER_SIGNUP_PERSISTENT_DRAFT_KEY],
  ];
  for (const [storage, key] of candidates) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const draft = parseTeacherSignupDraft(raw, now);
      if (draft) return draft;
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable; continue to the next safe fallback.
    }
  }
  return emptyTeacherSignupDraft();
};
