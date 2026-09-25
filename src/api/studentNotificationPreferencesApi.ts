import { apiRequest } from "@/api/client";

export type StudentNotificationCategory =
  | "announcements"
  | "attendance"
  | "academic"
  | "finance"
  | "admin"
  | "supervisor"
  | "chat";

export type StudentNotificationChannel = "push" | "socket";

export type StudentNotificationCategories = Record<StudentNotificationCategory, boolean>;
export type StudentNotificationChannels = Record<StudentNotificationChannel, boolean>;

export interface StudentNotificationPreferences {
  _id?: string;
  user?: string;
  categories: StudentNotificationCategories;
  channels: StudentNotificationChannels;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStudentNotificationPreferencesPayload {
  categories?: Partial<StudentNotificationCategories>;
  channels?: Partial<StudentNotificationChannels>;
  language?: string | null;
}

export interface StudentNotificationPreferencesResponse {
  success: true;
  data: StudentNotificationPreferences;
}

export const studentNotificationPreferencesApi = {
  getPreferences: () =>
    apiRequest<StudentNotificationPreferencesResponse>(
      "/notification-preferences/me",
    ),
  updatePreferences: (payload: UpdateStudentNotificationPreferencesPayload) =>
    apiRequest<StudentNotificationPreferencesResponse>(
      "/notification-preferences/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),
};
