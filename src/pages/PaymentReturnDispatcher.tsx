import { useMemo } from "react";
import TamaraReturn from "@/pages/TamaraReturn";
import StudentSubjectRequestReturn from "@/pages/StudentSubjectRequestReturn";
import StudentSubscriptionRenewalReturn from "@/pages/StudentSubscriptionRenewalReturn";
import StudentCourseEnrollmentReturn from "@/pages/StudentCourseEnrollmentReturn";
import { gulfPaymentDraftStore } from "@/lib/tamaraDraft";

export default function PaymentReturnDispatcher({ kind }: { kind: "success" | "failure" | "cancel" }) {
  const purpose = useMemo(() => gulfPaymentDraftStore.read()?.purpose, []);
  if (purpose === "subject_request") return <StudentSubjectRequestReturn />;
  if (purpose === "renewal") return <StudentSubscriptionRenewalReturn />;
  if (purpose === "course_enrollment") return <StudentCourseEnrollmentReturn />;
  return <TamaraReturn kind={kind} />;
}
