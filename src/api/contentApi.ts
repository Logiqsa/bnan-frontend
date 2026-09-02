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

export interface LegacyVisibility {
  testimonialImages: boolean;
  testimonialRatings: boolean;
  successStories: boolean;
}

export type LegalPageSlug = "privacy-policy" | "terms-and-conditions" | "teacher-terms-and-conditions";

export interface LegalPage {
  slug: LegalPageSlug;
  title: string;
  content: string;
  version?: number;
  updatedAt: string | null;
}

export const DEFAULT_LEGACY_VISIBILITY: LegacyVisibility = {
  testimonialImages: true,
  testimonialRatings: true,
  successStories: true,
};

export const contentApi = {
  getTestimonialImages: () =>
    apiRequest<{ success: true; data: TestimonialImage[] }>("/content/testimonial-images"),
  getSuccessStories: () =>
    apiRequest<{ success: true; data: SuccessStory[] }>("/content/success-stories"),
  getLegacyVisibility: () =>
    apiRequest<{ success: true; data: LegacyVisibility }>("/content/legacy-visibility"),
  getLegalPage: (slug: LegalPageSlug) =>
    apiRequest<{ success: true; data: LegalPage }>(`/content/legal-pages/${slug}`),

  admin: {
    listTestimonialImages: () =>
      apiRequest<{ success: true; data: TestimonialImage[] }>("/admin/testimonial-images"),
    createTestimonialImage: (body: FormData) =>
      apiRequest<{ success: true; data: TestimonialImage }>("/admin/testimonial-images", {
        method: "POST",
        body,
      }),
    updateTestimonialImage: (id: string, body: FormData) =>
      apiRequest<{ success: true; data: TestimonialImage }>(`/admin/testimonial-images/${id}`, {
        method: "PATCH",
        body,
      }),
    deleteTestimonialImage: (id: string) =>
      apiRequest<{ success: true }>(`/admin/testimonial-images/${id}`, { method: "DELETE" }),

    listSuccessStories: () =>
      apiRequest<{ success: true; data: SuccessStory[] }>("/admin/success-stories"),
    createSuccessStory: (body: FormData) =>
      apiRequest<{ success: true; data: SuccessStory }>("/admin/success-stories", {
        method: "POST",
        body,
      }),
    updateSuccessStory: (id: string, body: FormData) =>
      apiRequest<{ success: true; data: SuccessStory }>(`/admin/success-stories/${id}`, {
        method: "PATCH",
        body,
      }),
    deleteSuccessStory: (id: string) =>
      apiRequest<{ success: true }>(`/admin/success-stories/${id}`, { method: "DELETE" }),
    updateLegacyVisibility: (body: Partial<LegacyVisibility>) =>
      apiRequest<{ success: true; data: LegacyVisibility }>("/admin/content/legacy-visibility", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getLegalPage: (slug: LegalPageSlug) =>
      apiRequest<{ success: true; data: LegalPage }>(`/admin/content/legal-pages/${slug}`),
    updateLegalPage: (slug: LegalPageSlug, body: Pick<LegalPage, "title" | "content">) =>
      apiRequest<{ success: true; data: LegalPage }>(`/admin/content/legal-pages/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
};
