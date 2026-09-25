import { apiRequest } from "@/api/client";

export type StudentClassroomChangeRequestType = "change_teacher" | "cancel_subject";
export type StudentClassroomChangeRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | (string & Record<never, never>);

export interface StudentClassroomChangeRequest {
  id?: string;
  _id?: string;
  classroom: string | { id?: string; _id?: string; name?: string };
  classroomSubject: string | { id?: string; _id?: string };
  subject: string | { id?: string; _id?: string; name?: string };
  student: string | { id?: string; _id?: string };
  requester: string | { id?: string; _id?: string };
  requesterRole: "student" | "parent" | "teacher";
  requestType: StudentClassroomChangeRequestType | (string & Record<never, never>);
  notes: string;
  currentTeacher?: {
    id?: string;
    _id?: string;
    user?: { id?: string; _id?: string; fullName?: string } | string;
  } | string | null;
  replacementTeacher?: string | { id?: string; _id?: string; user?: { fullName?: string } | string } | null;
  status: StudentClassroomChangeRequestStatus;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | { id?: string; _id?: string; fullName?: string } | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentClassroomChangeRequestInput {
  classroomId: string;
  classroomSubjectId: string;
  requestType: StudentClassroomChangeRequestType;
  notes: string;
}

export interface StudentChangeRequestContextItem {
  classroomId: string;
  classroomName: string;
  classroomSubjectId: string;
  subject: { id: string; name: string };
  teacher: { id: string; name: string } | null;
}

interface ChangeRequestContextEnvelope { success: true; data: StudentChangeRequestContextItem[] }

interface ChangeRequestEnvelope { success: true; data: StudentClassroomChangeRequest }
interface ChangeRequestListEnvelope { success: true; results: number; data: StudentClassroomChangeRequest[] }

export const studentClassroomChangeRequestKeys = {
  all: ["student-classroom-change-requests"] as const,
  classroom: (classroomId: string) => ["student-classroom-change-requests", classroomId] as const,
};

export const studentClassroomChangeRequestsApi = {
  getContext: async () =>
    (await apiRequest<ChangeRequestContextEnvelope>("/students/me/change-requests/context")).data,
  createChangeRequest: async ({ classroomId, classroomSubjectId, requestType, notes }: CreateStudentClassroomChangeRequestInput) =>
    (await apiRequest<ChangeRequestEnvelope>(`/classrooms/${encodeURIComponent(classroomId)}/change-requests`, {
      method: "POST",
      body: JSON.stringify({ classroomSubjectId, requestType, notes }),
    })).data,
  listChangeRequests: async (classroomId: string) =>
    (await apiRequest<ChangeRequestListEnvelope>(`/classrooms/${encodeURIComponent(classroomId)}/change-requests`)).data,
};
