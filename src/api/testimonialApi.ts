import { apiRequest } from "./client";

export interface Testimonial {
  id: string;
  full_name: string;
  message: string;
  rating: number;
  approved: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TestimonialsResponse {
  success: true;
  data: Testimonial[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export const testimonialApi = {
  listApproved: () => apiRequest<TestimonialsResponse>("/testimonials?page=1&limit=50"),
  create: (body: { full_name: string; message: string; rating: number }) =>
    apiRequest<{ success: true; message: string; data: { id: string; status: "pending" } }>("/testimonials", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  admin: {
    list: (status: "all" | "pending" | "approved") =>
      apiRequest<TestimonialsResponse>(`/admin/testimonials?page=1&limit=50&status=${status}`),
    approve: (id: string) =>
      apiRequest<{ success: true; data: Testimonial }>(`/admin/testimonials/${id}/approve`, { method: "PATCH" }),
    unapprove: (id: string) =>
      apiRequest<{ success: true; data: Testimonial }>(`/admin/testimonials/${id}/unapprove`, { method: "PATCH" }),
    delete: (id: string) => apiRequest<{ success: true }>(`/admin/testimonials/${id}`, { method: "DELETE" }),
  },
};
