export type PortalRole = "teacher" | "student" | "admin";
export type RegistrationMode = "egyptian" | "gulf";

export interface RegisterParentBody {
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  password: string;
}

export interface StudentRegistrationInput {
  fullName: string;
  email: string;
  password: string;
  grade: string;
  subjects: string[];
}

export interface DirectRegisterBody {
  parent: { email: string; password: string };
  student: StudentRegistrationInput;
  curriculum: string;
  packageId: string;
  discountCode?: string;
}

export interface TamaraPaymentAddress {
  city: string;
  region: string;
  line1: string;
  line2?: string;
}

export type GulfPaymentProvider = "tamara" | "paymob";

export interface GulfCheckoutBody {
  provider: GulfPaymentProvider;
  parent: { email: string; password: string };
  student: StudentRegistrationInput;
  curriculum: string;
  packageId: string;
  items: Array<{
    subjectId: string;
    packageId: string;
  }>;
  discountCode?: string;
  paymentAddress?: TamaraPaymentAddress;
  locale: "ar_SA" | "en_US";
  isMobile: false;
}

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

export interface RegistrationResponse {
  success: true;
  message: string;
  token?: string;
  refreshToken?: string;
  data: PortalUser & { isVerified: boolean };
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
