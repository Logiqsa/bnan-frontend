import { apiRequest } from "./client";

export type GlobalNotificationAudience = "all" | "student" | "teacher" | "parent";

export interface SendGlobalNotificationPayload {
  title: string;
  audience: GlobalNotificationAudience;
  content?: string;
}

export interface GlobalNotificationResult {
  audience: GlobalNotificationAudience;
  title: string;
  content?: string;
  image?: string;
  status: "completed" | "partial" | string;
  usersTargeted?: number;
  notificationsCreated?: number;
  tokensTargeted?: number;
  pushSuccessCount?: number;
  pushFailureCount?: number;
}

export const globalNotificationsApi = {
  sendGlobalNotification: (payload: SendGlobalNotificationPayload, image?: File) => {
    if (image) {
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("audience", payload.audience);
      if (payload.content) formData.append("content", payload.content);
      formData.append("image", image);
      return apiRequest<{ success: true; data: GlobalNotificationResult }>("/notifications/global", {
        method: "POST",
        body: formData,
      });
    }
    return apiRequest<{ success: true; data: GlobalNotificationResult }>("/notifications/global", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
