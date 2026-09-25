import { apiRequest } from "@/api/client";

export interface StudentSettingsVerificationResponse {
  success: true;
  data: { verificationToken: string; expiresAt: string };
}

export interface StudentNameUpdateResponse {
  success: true;
  data?: { fullName?: string };
}

export interface StudentPasswordUpdateResponse {
  success: true;
  token?: string;
  refreshToken?: string;
  data?: { token?: string; refreshToken?: string; fullName?: string };
}

export const studentSettingsApi = {
  verifyParentPassword: (parentPassword: string) =>
    apiRequest<StudentSettingsVerificationResponse>("/students/me/settings-verification", {
      method: "POST",
      body: JSON.stringify({ parentPassword }),
    }),
  updateName: (fullName: string, verificationToken: string) =>
    apiRequest<StudentNameUpdateResponse>("/students/me/name", {
      method: "PATCH",
      body: JSON.stringify({ fullName, verificationToken }),
    }),
  updatePassword: (updatedPassword: string, verificationToken: string) =>
    apiRequest<StudentPasswordUpdateResponse>("/students/me/password", {
      method: "PATCH",
      body: JSON.stringify({ updatedPassword, verificationToken }),
    }),
};
