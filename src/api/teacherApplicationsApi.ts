import { apiRequest } from "./client";

export type TeacherApplicationStatus = "pending" | "approved" | "rejected";

export interface NamedEntity {
  id?: string;
  name?: string;
}

export interface TeacherAssignment {
  grade?: NamedEntity | string;
  subjects?: Array<NamedEntity | string>;
}

export interface TeacherApplication {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  nationality?: string;
  country?: string;
  city?: string;
  degree?: string;
  specialization?: string;
  institutionName?: string;
  graduationYear?: number;
  graduationGrade?: string;
  hasTeachingExperience?: boolean;
  hasOnlineTeachingExperience?: boolean;
  availableHoursPerWeek?: number;
  computerSkillLevel?: string;
  hasLaptop?: boolean;
  hasStableInternet?: boolean;
  hasGoodCamera?: boolean;
  hasMicrophone?: boolean;
  canProvideDemoSession?: boolean;
  introVideoUrl?: string;
  joiningReason?: string;
  weakStudentHandling?: string;
  termsAccepted?: boolean;
  status: TeacherApplicationStatus;
  isVerified?: boolean;
  curriculums?: Array<NamedEntity | string>;
  teacherAssignments?: TeacherAssignment[];
  cv?: string;
  cvUrl?: string;
  certificate?: string;
  certificateUrl?: string;
  identityDocument?: string;
  identityDocumentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    status?: string;
    isVerified?: boolean;
  };
}

export interface TeacherApplicationsResponse {
  success: true;
  data: TeacherApplication[];
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
}

export const teacherApplicationsApi = {
  list: (status: TeacherApplicationStatus, page = 1) =>
    apiRequest<TeacherApplicationsResponse>(`/teachers?status=${status}&page=${page}&limit=20`),
  get: (id: string) =>
    apiRequest<{ success: true; data: TeacherApplication }>(`/teachers/${id}`),
  updateStatus: (id: string, status: Exclude<TeacherApplicationStatus, "pending">) =>
    apiRequest<{ success: true; data: TeacherApplication }>(`/teachers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
