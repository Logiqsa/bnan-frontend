import { apiRequest } from "@/api/client";

export const studentHomeQueryKey = ["student-home"] as const;

export interface StudentHomeEntity {
  id: string;
  name?: string | null;
  registrationMode?: "egyptian" | "gulf" | null;
}

export interface StudentHomeSubscriptionSummary {
  packageName?: string | null;
  packageType?: "hours" | "monthly" | string | null;
  accessScope?: "all_subjects" | "single_subject" | string | null;
  registrationMode?: "egyptian" | "gulf" | null;
  planKind?: string | null;
  isActive?: boolean;
  computedStatus?: string | null;
  canRenew?: boolean;
  hasPendingRenewal?: boolean;
  subject?: StudentHomeEntity | null;
  totalHours?: number | null;
  usedHours?: number | null;
  remainingHours?: number | null;
  purchasedMonths?: number | null;
  progressPercentage?: number | null;
  remaining?: unknown;
}

export interface StudentHomeSubscription {
  id?: string;
  summary?: StudentHomeSubscriptionSummary | null;
}

export interface StudentHomeResponse {
  student: {
    id: string;
    userId: string;
    fullName?: string | null;
    email?: string | null;
    registrationStatus?: string;
    curriculum?: StudentHomeEntity | null;
    grade?: StudentHomeEntity | null;
    subjects?: StudentHomeEntity[];
  };
  subscription: StudentHomeSubscription | null;
  subscriptions: StudentHomeSubscription[];
  stats: {
    certificates?: { count?: number } | null;
    interaction?: {
      score?: number | null;
      maxScore?: number | null;
      evaluationsCount?: number;
    } | null;
    attendance?: {
      percentage?: number | null;
      total?: number;
      present?: number;
      late?: number;
      absent?: number;
    } | null;
  };
  weeklyEvaluation?: {
    week?: number | null;
    weekStart?: string | null;
    weekEnd?: string | null;
    evaluationsCount?: number;
    attendancePercentage?: number | null;
    participationPercentage?: number | null;
    homeworkPercentage?: number | null;
    behaviorPercentage?: number | null;
    bonusPoints?: number;
    teacherNote?: string | null;
    notes?: string[];
  } | null;
  generatedAt: string;
}

interface StudentHomeEnvelope {
  success: true;
  data: StudentHomeResponse;
}

export const studentHomeApi = {
  get: async () => {
    const response = await apiRequest<StudentHomeEnvelope>("/students/me/home");
    return response.data;
  },
};
