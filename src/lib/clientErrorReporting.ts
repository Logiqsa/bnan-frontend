import { API_BASE_URL, ApiError } from "@/api/client";

export type ClientErrorPhase =
  | "preparing-request"
  | "validation"
  | "compressing-files"
  | "uploading"
  | "waiting-response"
  | "success-handling"
  | "unknown";

export interface ClientErrorReport {
  source: "teacher-signup";
  platform: "web";
  phase: ClientErrorPhase;
  errorCode: string;
  message: string;
  durationMs: number;
  name?: string;
  email: string;
  phone: string;
  browser: string;
  os: string;
  filesCount: number;
  totalSizeMB: number;
  lastStep: number;
}

const clientInfo = () => {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Unknown";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
  return { browser, os };
};

export const sanitizeClientErrorMessage = (message: string, secrets: string[] = []): string => {
  let sanitized = message;
  for (const secret of secrets) {
    if (secret) sanitized = sanitized.split(secret).join("[REDACTED]");
  }
  return sanitized
    .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:password|passcode|otp|token|authorization)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
};

export const reportClientError = async (
  report: Omit<ClientErrorReport, "source" | "platform" | "browser" | "os">,
): Promise<void> => {
  const payload: ClientErrorReport = {
    source: "teacher-signup",
    platform: "web",
    ...report,
    ...clientInfo(),
  };

  if (import.meta.env.DEV) console.debug("[TeacherSignup] client error report", payload);

  const response = await fetch(`${API_BASE_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Client error reporting failed (${response.status})`);
};

export const teacherSignupErrorCode = (error: unknown): string => {
  if (error instanceof ApiError || (error && typeof error === "object" && "code" in error)) {
    const apiError = error as Pick<ApiError, "code" | "data">;
    const axiosCode = typeof apiError.data?.axiosCode === "string" ? apiError.data.axiosCode : "";
    if (axiosCode === "ECONNABORTED" || axiosCode === "ETIMEDOUT") return "TIMEOUT";
    return apiError.code || "API_ERROR";
  }
  return error instanceof Error && error.name ? error.name : "UNKNOWN_ERROR";
};
