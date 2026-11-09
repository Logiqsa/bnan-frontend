import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/authApi";
import { studentSettingsApi } from "@/api/studentSettingsApi";
import AccountSettings from "./AccountSettings";
import { LanguageProvider } from "@/i18n/LanguageContext";

const updateCurrentUser = vi.fn();
const forgetRememberedAccount = vi.fn();
const logout = vi.fn();
const student = { id: "student-1", fullName: "Old Name", email: "student@example.com", role: "student" as const, status: "active" };

vi.mock("@/api/authApi", () => ({
  authApi: {
    profile: vi.fn(),
    updateName: vi.fn(),
    updatePassword: vi.fn(),
    updateTimeZone: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));
vi.mock("@/api/studentSettingsApi", () => ({
  studentSettingsApi: {
    verifyParentPassword: vi.fn(),
    updateName: vi.fn(),
    updatePassword: vi.fn(),
  },
}));
vi.mock("@/api/client", () => ({
  ApiError: class ApiError extends Error { status = 0; code = "API_ERROR"; },
  tokenStore: { getRefresh: vi.fn(() => "refresh"), isPersistent: vi.fn(() => false), set: vi.fn() },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("./PortalAuthContext", () => ({ usePortalAuth: () => ({ user: student, updateCurrentUser, forgetRememberedAccount, logout, loading: false }) }));
vi.mock("./TeacherSettingsSections", () => ({ TeacherPhoneSettings: () => null, TeacherPayoutProfileSettings: () => null }));
vi.mock("@/components/TimeZoneSelect", () => ({
  default: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => (
    <button type="button" aria-label="اختيار مصر" onClick={() => onValueChange("Africa/Cairo")}>{value}</button>
  ),
}));

const renderSettings = () => render(<LanguageProvider><AccountSettings /></LanguageProvider>);

describe("AccountSettings student verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.profile).mockResolvedValue({ success: true, data: { parentEmail: "parent@example.com" } });
    vi.mocked(studentSettingsApi.verifyParentPassword).mockResolvedValue({ success: true, data: { verificationToken: "proof", expiresAt: "later" } });
    vi.mocked(studentSettingsApi.updateName).mockResolvedValue({ success: true, data: { fullName: "New Name" } });
    vi.mocked(studentSettingsApi.updatePassword).mockResolvedValue({ success: true, token: "new-token", refreshToken: "new-refresh" });
    vi.mocked(authApi.deleteAccount).mockResolvedValue({ success: true, data: null });
  });

  it("verifies the parent before changing the student name without persisting secrets", async () => {
    renderSettings();
    expect(await screen.findByDisplayValue("parent@example.com")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الاسم" }));
    fireEvent.change(screen.getByLabelText("كلمة مرور ولي الأمر"), { target: { value: "parent-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    await waitFor(() => expect(studentSettingsApi.updateName).toHaveBeenCalledWith("New Name", "proof"));
    expect(authApi.updateName).not.toHaveBeenCalled();
    expect(localStorage.getItem("parent-secret")).toBeNull();
    expect(sessionStorage.getItem("parent-secret")).toBeNull();
  });

  it("uses parent verification and returned tokens for a student password change", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "تغيير كلمة المرور" }));
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور الجديدة"), { target: { value: "new-password" } });
    fireEvent.click(screen.getAllByRole("button", { name: "تغيير كلمة المرور" })[1]);
    fireEvent.change(screen.getByLabelText("كلمة مرور ولي الأمر"), { target: { value: "parent-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    await waitFor(() => expect(studentSettingsApi.updatePassword).toHaveBeenCalledWith("new-password", "proof"));
    expect(authApi.updatePassword).not.toHaveBeenCalled();
  });

  it("does not overwrite a timezone selection with a late profile response", async () => {
    let resolveProfile!: (value: { success: true; data: { timeZone: "Asia/Riyadh" } }) => void;
    vi.mocked(authApi.profile).mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "اختيار مصر" }));
    resolveProfile({ success: true, data: { timeZone: "Asia/Riyadh" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "اختيار مصر" })).toHaveTextContent("Africa/Cairo"));
  });

  it("requires the current password, deletes the account, and clears its local session", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "حذف حسابي" }));
    fireEvent.change(screen.getByLabelText("كلمة المرور الحالية"), { target: { value: "account-password" } });
    fireEvent.click(screen.getByRole("button", { name: "حذف الحساب نهائيًا" }));

    await waitFor(() => expect(authApi.deleteAccount).toHaveBeenCalledWith("account-password"));
    expect(forgetRememberedAccount).toHaveBeenCalledWith("student-1");
    expect(logout).toHaveBeenCalled();
  });
});
