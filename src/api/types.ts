export type PortalRole = "teacher" | "student" | "admin";
export type RegistrationMode = "egyptian" | "gulf";

export interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  role: PortalRole;
  status: string;
  registrationMode?: RegistrationMode;
  registrationModes?: RegistrationMode[];
}

export interface AuthResponse {
  success: true;
  token: string;
  refreshToken: string;
  data: PortalUser;
}

export interface ActiveSession {
  id?: string;
  sessionId?: string;
  status: "starting" | "live" | "awaiting_zoom_end" | "ended";
  canJoin?: boolean;
  recordingUrl?: string | null;
  recording_url?: string | null;
  summary?: string | null;
  summaryUrl?: string | null;
  summary_url?: string | null;
  aiReport?: string | null;
  ai_report?: string | null;
}

export interface PortalLesson {
  key: string;
  lessonId?: string;
  registrationMode: RegistrationMode;
  classroom: { id: string; name: string };
  classroomSubjectId: string;
  subject: { id: string; name: string };
  teacher?: { name?: string; fullName?: string };
  day: string;
  date: string | null;
  startTime: string;
  scheduledAt: string | null;
  activeSession: ActiveSession | null;
}
