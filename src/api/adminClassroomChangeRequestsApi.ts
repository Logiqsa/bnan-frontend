import { apiRequest } from "./client";

export type AdminClassroomChangeRequestType = "change_teacher" | "teacher_leave" | "cancel_subject";
export type AdminClassroomChangeRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AdminRequestPerson {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  user?: AdminRequestPerson | string;
}

export interface AdminClassroomChangeRequest {
  id?: string;
  _id?: string;
  classroom?: AdminRequestPerson | string;
  subject?: AdminRequestPerson | string;
  student?: AdminRequestPerson | string;
  requester?: AdminRequestPerson | string;
  requesterRole?: string;
  requestType: AdminClassroomChangeRequestType;
  notes?: string;
  currentTeacher?: AdminRequestPerson | string | null;
  replacementTeacher?: AdminRequestPerson | string | null;
  status: AdminClassroomChangeRequestStatus;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: AdminRequestPerson | string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminClassroomChangeRequestList {
  success: true;
  data: AdminClassroomChangeRequest[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  results?: number;
}

type RequestEnvelope = { success: true; data: AdminClassroomChangeRequest };

const normalize = (item: AdminClassroomChangeRequest): AdminClassroomChangeRequest => ({
  ...item,
  id: item.id || item._id,
});

export const adminClassroomChangeRequestsApi = {
  list: async (params: { status?: AdminClassroomChangeRequestStatus; requestType?: AdminClassroomChangeRequestType; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.requestType) query.set("requestType", params.requestType);
    query.set("page", String(params.page || 1));
    query.set("limit", String(params.limit || 20));
    const result = await apiRequest<AdminClassroomChangeRequestList>(`/admin/classroom-change-requests?${query.toString()}`);
    return { ...result, data: (result.data || []).map(normalize) };
  },
  get: async (id: string) => {
    const result = await apiRequest<RequestEnvelope>(`/admin/classroom-change-requests/${encodeURIComponent(id)}`);
    return { ...result, data: normalize(result.data) };
  },
  approve: (id: string, body: { replacementTeacherId?: string; adminNotes?: string }) =>
    apiRequest<RequestEnvelope>(`/admin/classroom-change-requests/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reject: (id: string, body: { rejectionReason?: string }) =>
    apiRequest<RequestEnvelope>(`/admin/classroom-change-requests/${encodeURIComponent(id)}/reject`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
