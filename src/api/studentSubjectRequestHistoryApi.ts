import { apiRequest } from "@/api/client";

export type StudentSubjectRequestStatus =
  | "awaiting_admin_approval"
  | "pending"
  | "assigned"
  | "rejected"
  | "cancelled"
  | (string & Record<never, never>);

export interface StudentSubjectRequestHistoryItem {
  subjectRequestId: string;
  curriculum: {
    id: string | null;
    name: string | null;
    registrationMode: "egyptian" | "gulf" | null;
  } | null;
  subject: { id: string | null; name: string | null } | null;
  status: StudentSubjectRequestStatus;
  notes: string | null;
  requestedAt: string;
  package: {
    id: string | null;
    name: string | null;
    type: string | null;
    hours: number | null;
    price: number | null;
    currency: string | null;
  } | null;
}

interface StudentSubjectRequestHistoryEnvelope {
  success: true;
  results: number;
  data: StudentSubjectRequestHistoryItem[];
}

export const studentSubjectRequestHistoryQueryKey = ["student-subject-request-history"] as const;

export const studentSubjectRequestHistoryApi = {
  list: async () =>
    (await apiRequest<StudentSubjectRequestHistoryEnvelope>("/gulf-student-subject-requests")).data,
};
