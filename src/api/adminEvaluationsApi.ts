import { apiRequest } from "./client";

export interface AdminEvaluationEntity {
  id: string;
  name?: string | null;
}

export interface AdminEvaluationStudent {
  id: string;
  user?: { id?: string; fullName?: string | null; email?: string | null } | null;
}

export interface AdminEvaluation {
  id: string;
  student?: AdminEvaluationStudent | null;
  classroom?: AdminEvaluationEntity | null;
  subject?: AdminEvaluationEntity | null;
  curriculum?: AdminEvaluationEntity | null;
  grade?: AdminEvaluationEntity | null;
  weekStart?: string;
  attendance?: string;
  participation?: string;
  homework?: string;
  behavior?: string;
  bonus?: number;
  notes?: string;
  createdByRole?: string;
  updatedByRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminEvaluationFilters {
  classroom?: string;
  student?: string;
  teacher?: string;
  subject?: string;
  curriculum?: string;
  grade?: string;
  week?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminEvaluationsResponse {
  success: true;
  results: number;
  data: AdminEvaluation[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminEvaluationResponse {
  success: true;
  data: AdminEvaluation;
}

const queryFrom = (filters: AdminEvaluationFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return params.toString();
};
export const adminEvaluationsApi = {
  listEvaluations: (filters: AdminEvaluationFilters) => {
    const query = queryFrom(filters);
    return apiRequest<AdminEvaluationsResponse>(`/admin/evaluations${query ? `?${query}` : ""}`);
  },
  getEvaluation: (id: string) =>
    apiRequest<AdminEvaluationResponse>(`/admin/evaluations/${encodeURIComponent(id)}`),
};
