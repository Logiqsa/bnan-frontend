import { apiRequest } from "./client";

export interface CourseStaffOption {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  curriculumIds?: string[];
}
type Ref = {
  _id?: string;
  id?: string;
  name?: string;
  status?: "pending" | "approved" | "rejected";
  user?: {
    _id?: string;
    id?: string;
    fullName?: string;
    email?: string;
    status?: string;
  };
  curriculums?: Array<string | { _id?: string; id?: string }>;
  curriculum?: string | { _id?: string; id?: string };
};
const idOf = (value: string | { _id?: string; id?: string }) =>
  typeof value === "string" ? value : value.id || value._id || "";
const normalize = (x: Ref): CourseStaffOption => ({
  id: x.id || x._id || "",
  userId: x.user?.id || x.user?._id,
  name: x.user?.fullName || x.name || x.user?.email || "—",
  email: x.user?.email,
  curriculumIds: [
    ...(x.curriculums || []).map(idOf),
    ...(x.curriculum ? [idOf(x.curriculum)] : []),
  ].filter(Boolean),
});
export const courseStaffApi = {
  teachers: async () =>
    (
      await apiRequest<{ success: true; data: Ref[] }>(
        "/teachers?status=approved&page=1&limit=100",
      )
    ).data
      .filter(
        (teacher) =>
          teacher.status === "approved" && teacher.user?.status === "active",
      )
      .map(normalize),
  supervisors: async () =>
    (
      await apiRequest<{ success: true; data: Ref[] }>(
        "/supervisors?page=1&limit=100",
      )
    ).data.map(normalize),
};
