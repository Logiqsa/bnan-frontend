import { apiRequest } from "@/api/client";

export type TeacherPayoutMethod = "wallet" | "bank_account" | "instapay";

export interface TeacherPayoutProfile {
  method: TeacherPayoutMethod;
  accountHolderName: string;
  walletProvider?: string;
  walletPhone?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  instapayAddress?: string;
  updatedAt?: string;
}

export type TeacherPayoutProfileInput = Omit<TeacherPayoutProfile, "updatedAt">;

interface TeacherPayoutProfileResponse {
  success: true;
  data: TeacherPayoutProfile | null;
}

export const teacherPayoutProfileApi = {
  get: async () => {
    const response = await apiRequest<TeacherPayoutProfileResponse>(
      "/teachers/me/payout-profile",
    );
    return response.data;
  },
  update: async (body: TeacherPayoutProfileInput) => {
    const response = await apiRequest<TeacherPayoutProfileResponse>(
      "/teachers/me/payout-profile",
      { method: "PUT", body: JSON.stringify(body) },
    );
    return response.data;
  },
};
