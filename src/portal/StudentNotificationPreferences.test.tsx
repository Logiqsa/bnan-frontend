import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studentNotificationPreferencesApi } from "@/api/studentNotificationPreferencesApi";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentNotificationPreferences from "./StudentNotificationPreferences";

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/api/studentNotificationPreferencesApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/studentNotificationPreferencesApi")>();
  return {
    ...actual,
    studentNotificationPreferencesApi: {
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    },
  };
});
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ toast: toastMocks }));

const initialPreferences = {
  announcements: true,
  attendance: false,
  academic: true,
  finance: true,
  admin: true,
  supervisor: false,
  chat: true,
};
const initialChannels = { push: true, socket: true };
const response = (categories = initialPreferences, channels = initialChannels) => ({
  success: true as const,
  data: { _id: "preference-1", user: "student-user-1", categories, channels, language: "ar" },
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><StudentNotificationPreferences /></LanguageProvider></QueryClientProvider>);
};

describe("StudentNotificationPreferences", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    vi.mocked(studentNotificationPreferencesApi.getPreferences).mockReset().mockResolvedValue(response());
    vi.mocked(studentNotificationPreferencesApi.updatePreferences).mockReset().mockImplementation(async (payload) => response(
      { ...initialPreferences, ...(payload.categories || {}) },
      { ...initialChannels, ...(payload.channels || {}) },
    ));
  });

  it("renders the backend-supported category and channel values only", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "إعدادات الإشعارات" })).toBeInTheDocument();
    expect(studentNotificationPreferencesApi.getPreferences).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("switch", { name: "الإشعارات الأكاديمية" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "الحضور والغياب" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "الإشعارات المنبثقة" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "التنبيهات الفورية داخل النظام" })).toBeChecked();
    ["البريد الإلكتروني", "SMS", "WhatsApp", "التسويق"].forEach((label) => expect(screen.queryByText(label)).not.toBeInTheDocument());
    expect(screen.queryByRole("switch", { name: /الواجبات|الحصص|التقييمات|الاشتراكات فقط/ })).not.toBeInTheDocument();
    expect(screen.getByText(/قد تظل ظاهرة داخل مركز الإشعارات/)).toBeInTheDocument();
  });

  it.each([
    ["الإشعارات الأكاديمية", { categories: { academic: false } }],
    ["المحادثات", { categories: { chat: false } }],
    ["الإشعارات المنبثقة", { channels: { push: false } }],
    ["التنبيهات الفورية داخل النظام", { channels: { socket: false } }],
  ] as const)("patches only the changed %s preference and synchronizes the UI", async (label, payload) => {
    renderPage();
    const toggle = await screen.findByRole("switch", { name: label });
    fireEvent.click(toggle);
    await waitFor(() => expect(studentNotificationPreferencesApi.updatePreferences).toHaveBeenCalledWith(payload));
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(toastMocks.success).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmed value and reports a mutation error", async () => {
    vi.mocked(studentNotificationPreferencesApi.updatePreferences).mockRejectedValueOnce(new Error("تعذر الحفظ"));
    renderPage();
    const toggle = await screen.findByRole("switch", { name: "المحادثات" });
    fireEvent.click(toggle);
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("تعذر الحفظ"));
    expect(toggle).toBeChecked();
  });

  it("renders loading then an error with retry", async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    vi.mocked(studentNotificationPreferencesApi.getPreferences).mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    renderPage();
    expect(screen.getByLabelText("جاري تحميل إعدادات الإشعارات")).toBeInTheDocument();
    rejectRequest(new Error("failed"));
    expect(await screen.findByText("تعذر تحميل إعدادات الإشعارات.")).toBeInTheDocument();

    vi.mocked(studentNotificationPreferencesApi.getPreferences).mockResolvedValueOnce(response());
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("أنواع الإشعارات")).toBeInTheDocument();
  });
});
