import { apiRequest } from "./client";

export interface AcademicSettings { startDate: string; source: "database" | "environment"; updatedAt?: string | null }
type Response = { success: true; data: AcademicSettings };

export const academicSettingsApi = {
  get: async () => (await apiRequest<Response>("/admin/academic-settings")).data,
  update: async (startDate: string) => (await apiRequest<Response>("/admin/academic-settings", { method: "PUT", body: JSON.stringify({ startDate }) })).data,
};
