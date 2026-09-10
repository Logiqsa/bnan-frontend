import {
  TEACHER_SIGNUP_VALUE_FIELDS,
  type TeacherSignupValueField,
  type TeacherSignupValues,
} from "./teacherSignupDraft";

export interface TeacherSignupSubmitSnapshot {
  values: TeacherSignupValues;
  password: string;
  selectedCurriculum: string;
  selectedGrades: string[];
  assignments: Record<string, string[]>;
  additionalCurriculums: string[];
  files: Record<string, File | null>;
  experienceCertificates: File[];
}

const requiredValueFields: TeacherSignupValueField[] = [
  "fullName", "email", "phone", "dateOfBirth", "whatsapp", "nationality",
  "country", "city", "degree", "specialization", "graduationYear",
  "graduationGrade", "availableHoursPerWeek", "computerSkillLevel",
  "hasTeachingExperience", "hasOnlineTeachingExperience", "hasLaptop",
  "hasStableInternet", "hasGoodCamera", "hasMicrophone",
  "canProvideDemoSession", "introVideoUrl", "joiningReason",
  "weakStudentHandling",
];
const requiredFileFields = ["cv", "certificate", "identityDocument", "stableInternetProof"] as const;

export const validateFinalSnapshot = (snapshot: TeacherSignupSubmitSnapshot): string | null => {
  if (requiredValueFields.some((field) => !snapshot.values[field]?.trim()))
    return "أكمل جميع الحقول المطلوبة قبل إرسال الطلب.";
  if (snapshot.values.fullName!.trim().length < 3)
    return "أكمل جميع الحقول المطلوبة قبل إرسال الطلب.";
  if (!snapshot.password) return "كلمة المرور مطلوبة. ارجع إلى البيانات الشخصية وأدخل كلمة المرور قبل إرسال الطلب.";
  if (snapshot.values.termsAccepted !== "true") return "يجب الموافقة على شروط وأحكام تسجيل المعلمين.";
  if (snapshot.values.dateOfBirth! > new Date().toISOString().slice(0, 10)
    || Number(snapshot.values.availableHoursPerWeek) < 1)
    return "راجع البيانات المطلوبة قبل إرسال الطلب.";
  if (!snapshot.selectedCurriculum.trim()
    || snapshot.selectedGrades.length === 0
    || snapshot.selectedGrades.some((gradeId) => !gradeId.trim()
      || !(snapshot.assignments[gradeId]?.length)
      || snapshot.assignments[gradeId].some((subjectId) => !subjectId.trim())))
    return "اختر منهجًا وصفًا واحدًا على الأقل ومادة واحدة لكل صف.";
  if (requiredFileFields.some((field) => !(snapshot.files[field] instanceof File)))
    return "أعد اختيار جميع الملفات المطلوبة قبل إرسال الطلب.";
  return null;
};

export const buildTeacherSignupFormData = (
  snapshot: TeacherSignupSubmitSnapshot,
  uploadFiles: Record<string, File | null>,
  uploadExperienceCertificates: File[],
) => {
  const body = new FormData();
  TEACHER_SIGNUP_VALUE_FIELDS.forEach((field) => {
    const value = snapshot.values[field];
    if (typeof value === "string" && value.length > 0) body.append(field, value);
  });
  body.set("password", snapshot.password);
  body.append("curriculum", snapshot.selectedCurriculum);
  body.append("additionalCurriculums", JSON.stringify(
    snapshot.additionalCurriculums.filter((id) => id !== snapshot.selectedCurriculum),
  ));
  body.append("teacherAssignments", JSON.stringify(
    snapshot.selectedGrades.map((grade) => ({
      grade,
      subjects: [...snapshot.assignments[grade]],
    })),
  ));
  requiredFileFields.forEach((key) => {
    const file = uploadFiles[key];
    if (file instanceof File) body.append(key, file);
  });
  uploadExperienceCertificates.forEach((file) => body.append("experienceCertificates", file));
  return body;
};
