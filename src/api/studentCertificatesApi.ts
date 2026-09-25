import { apiRequest } from "@/api/client";

export type KnownModernCertificateType =
  | "student_monthly"
  | "ideal_teacher"
  | "ideal_supervisor"
  | "general_teacher";

export interface ModernStudentCertificate {
  _id: string;
  certificateNumber: string;
  certificateType: KnownModernCertificateType | (string & Record<never, never>);
  recipient: string;
  recipientSnapshot?: { fullName: string };
  academicContext?: {
    curriculum: string;
    curriculumNameSnapshot: string;
    grade: string;
    gradeNameSnapshot: string;
    classroom?: string;
    classroomNameSnapshot?: string;
  };
  period?: { month: number; year: number };
  subjects?: Array<{
    subject: string;
    nameSnapshot: string;
    maxScore: number;
    score: number;
  }>;
  totalScore?: number;
  totalMaxScore?: number;
  percentage?: number;
  previewImagePath?: string | null;
  pdfPath?: string | null;
  issuedAt?: string;
}

interface ModernCertificatesResponse {
  success: true;
  length: number;
  data: ModernStudentCertificate[];
}

export const studentModernCertificatesQueryKey = ["student-certificates-modern"] as const;

export const studentCertificatesApi = {
  getMyCertificates: async (): Promise<ModernStudentCertificate[]> =>
    (await apiRequest<ModernCertificatesResponse>("/certificates/my")).data,
};
