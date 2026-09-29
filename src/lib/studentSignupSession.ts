export const STUDENT_SIGNUP_DRAFT_KEY = "bnan_student_signup_draft_v2";
export const COURSE_STUDENT_SIGNUP_DRAFT_KEY =
  "bnan_course_student_signup_draft_v2";

const LEGACY_KEYS = [
  "bnan_student_signup_draft",
  "bnan_student_signup_persistent_draft",
  "bnan_course_student_signup_draft",
  "bnan_course_student_signup_persistent_draft",
];

export const clearStudentSignupDrafts = () => {
  if (typeof window === "undefined") return;
  [STUDENT_SIGNUP_DRAFT_KEY, COURSE_STUDENT_SIGNUP_DRAFT_KEY, ...LEGACY_KEYS].forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore unavailable session storage in private browsing.
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore unavailable local storage in private browsing.
    }
  });
};
