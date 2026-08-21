import { apiRequest } from "./client";

export interface TestimonialImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SuccessStory {
  id: string;
  name: string;
  audioUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export const contentApi = {
  getTestimonialImages: () =>
    apiRequest<{ success: true; data: TestimonialImage[] }>("/api/v1/content/testimonial-images"),
  getSuccessStories: () =>
    apiRequest<{ success: true; data: SuccessStory[] }>("/api/v1/content/success-stories"),

  admin: {
    listTestimonialImages: () =>
      apiRequest<{ success: true; data: TestimonialImage[] }>("/api/v1/admin/testimonial-images"),
    createTestimonialImage: (body: FormData) =>
      apiRequest<{ success: true; data: TestimonialImage }>("/api/v1/admin/testimonial-images", {
        method: "POST",
        body,
      }),
    updateTestimonialImage: (id: string, body: FormData) =>
      apiRequest<{ success: true; data: TestimonialImage }>(`/api/v1/admin/testimonial-images/${id}`, {
        method: "PATCH",
        body,
      }),
    deleteTestimonialImage: (id: string) =>
      apiRequest<{ success: true }>(`/api/v1/admin/testimonial-images/${id}`, { method: "DELETE" }),

    listSuccessStories: () =>
      apiRequest<{ success: true; data: SuccessStory[] }>("/api/v1/admin/success-stories"),
    createSuccessStory: (body: FormData) =>
      apiRequest<{ success: true; data: SuccessStory }>("/api/v1/admin/success-stories", {
        method: "POST",
        body,
      }),
    updateSuccessStory: (id: string, body: FormData) =>
      apiRequest<{ success: true; data: SuccessStory }>(`/api/v1/admin/success-stories/${id}`, {
        method: "PATCH",
        body,
      }),
    deleteSuccessStory: (id: string) =>
      apiRequest<{ success: true }>(`/api/v1/admin/success-stories/${id}`, { method: "DELETE" }),
  },
};
