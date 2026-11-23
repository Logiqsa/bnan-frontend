import { apiRequest } from "./client";

export interface ParentChild {
  id: string;
  userId?: string | null;
  fullName: string;
  registrationMode?: "egyptian" | "gulf" | null;
  curriculum?: { id: string; name: string } | null;
  grade?: { id: string; name: string } | null;
}

export const parentApi = {
  getChildren: () => apiRequest<{ status: "success"; data: ParentChild[] }>("/parents/my-childs"),
};
