import { apiRequest } from "./client";

export interface ContactPhone {
  id?: string;
  label: string;
  value: string;
  isWhatsapp: boolean;
  isPrimary: boolean;
}

export interface ContactEmail {
  id?: string;
  label: string;
  value: string;
  isPrimary: boolean;
}

export type SocialPlatform = "instagram" | "facebook" | "x" | "tiktok" | "youtube" | "snapchat" | "linkedin" | "telegram";

export interface SocialLink {
  id?: string;
  platform: SocialPlatform;
  url: string;
  isActive: boolean;
  order: number;
}

export interface ContactSettings {
  phones: ContactPhone[];
  emails: ContactEmail[];
  socialLinks: SocialLink[];
}

export const defaultContactSettings: ContactSettings = {
  phones: [
    { label: "اتصل بنا", value: "+966 58 250 2026", isWhatsapp: true, isPrimary: true },
    { label: "خط إضافي", value: "+966 53 080 8189", isWhatsapp: false, isPrimary: false },
    { label: "خط مصر", value: "+20 10 9156 9792", isWhatsapp: false, isPrimary: false },
  ],
  emails: [
    { label: "البريد الإلكتروني", value: "info@bnanacademysa.com", isPrimary: true },
  ],
  socialLinks: [
    { platform: "instagram", url: "https://www.instagram.com/bnanacademy_sa?igsh=eWN4c2RyNnoxZzBy&utm_source=qr", isActive: true, order: 0 },
    { platform: "x", url: "https://x.com/bnanacademy_sa", isActive: true, order: 1 },
    { platform: "tiktok", url: "https://www.tiktok.com/@bnanacademy_sa", isActive: true, order: 2 },
    { platform: "snapchat", url: "https://snapchat.com/t/J3dAMP59", isActive: true, order: 3 },
    { platform: "facebook", url: "https://www.facebook.com/share/19P2F1jE38/", isActive: true, order: 4 },
    { platform: "youtube", url: "https://www.youtube.com/@BnanAcademy_sa", isActive: true, order: 5 },
  ],
};

const unwrap = (response: ContactSettings | { data: ContactSettings }) =>
  "data" in response ? response.data : response;

export const contactSettingsApi = {
  public: async () => unwrap(await apiRequest<ContactSettings | { data: ContactSettings }>("/contact-settings")),
  admin: async () => unwrap(await apiRequest<ContactSettings | { data: ContactSettings }>("/admin/contact-settings")),
  update: async (body: ContactSettings) => unwrap(await apiRequest<ContactSettings | { data: ContactSettings }>("/admin/contact-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  })),
};
