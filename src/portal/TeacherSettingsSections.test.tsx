import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import {
  TeacherPayoutProfileSettings,
  TeacherPhoneSettings,
} from "./TeacherSettingsSections";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  updatePhone: vi.fn(),
  getPayout: vi.fn(),
  updatePayout: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/api/authApi", () => ({
  authApi: { profile: mocks.profile, updatePhone: mocks.updatePhone },
}));
vi.mock("@/api/teacherPayoutProfileApi", () => ({
  teacherPayoutProfileApi: { get: mocks.getPayout, update: mocks.updatePayout },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const renderSection = (component: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>{component}</LanguageProvider>
    </QueryClientProvider>,
  );
};

describe("Teacher settings sections", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "en");
    mocks.profile.mockReset();
    mocks.updatePhone.mockReset();
    mocks.getPayout.mockReset();
    mocks.updatePayout.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it("updates the teacher phone successfully", async () => {
    mocks.profile.mockResolvedValue({ success: true, data: { phone: "01000000000" } });
    mocks.updatePhone.mockResolvedValue({ success: true, data: { phone: "01111111111" } });
    renderSection(<TeacherPhoneSettings />);

    expect(await screen.findByText("01000000000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "01111111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Save phone number" }));

    await waitFor(() => expect(mocks.updatePhone).toHaveBeenCalledWith("01111111111"));
    expect(await screen.findByText("01111111111")).toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("shows a backend phone update failure safely", async () => {
    mocks.profile.mockResolvedValue({ success: true, data: { phone: "01000000000" } });
    mocks.updatePhone.mockRejectedValue(new Error("failed"));
    renderSection(<TeacherPhoneSettings />);

    await screen.findByText("01000000000");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "01111111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Save phone number" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update phone number.");
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it("shows payout loading and then the unconfigured state", async () => {
    let resolveProfile: (value: null) => void = () => undefined;
    mocks.getPayout.mockReturnValue(new Promise<null>((resolve) => { resolveProfile = resolve; }));
    renderSection(<TeacherPayoutProfileSettings />);

    expect(screen.getByLabelText("Loading payout profile")).toBeInTheDocument();
    resolveProfile(null);
    expect(await screen.findByText("Your payout profile has not been configured yet.")).toBeInTheDocument();
  });

  it("saves an empty payout profile successfully", async () => {
    mocks.getPayout.mockResolvedValue(null);
    mocks.updatePayout.mockImplementation(async (body) => body);
    renderSection(<TeacherPayoutProfileSettings />);

    fireEvent.click(await screen.findByRole("button", { name: "Add payout profile" }));
    fireEvent.change(screen.getByLabelText("Account holder name"), { target: { value: "Teacher Name" } });
    fireEvent.change(screen.getByLabelText("Wallet provider"), { target: { value: "Wallet Co" } });
    fireEvent.change(screen.getByLabelText("Wallet phone"), { target: { value: "01000000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save payout profile" }));

    await waitFor(() => expect(mocks.updatePayout).toHaveBeenCalledWith({
      method: "wallet",
      accountHolderName: "Teacher Name",
      walletProvider: "Wallet Co",
      walletPhone: "01000000000",
    }));
    expect(await screen.findByText("Wallet Co")).toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("shows payout save failures and prevents duplicate pending saves", async () => {
    mocks.getPayout.mockResolvedValue(null);
    let rejectSave: (error: Error) => void = () => undefined;
    mocks.updatePayout.mockReturnValue(new Promise((_, reject) => { rejectSave = reject; }));
    renderSection(<TeacherPayoutProfileSettings />);

    fireEvent.click(await screen.findByRole("button", { name: "Add payout profile" }));
    fireEvent.change(screen.getByLabelText("Account holder name"), { target: { value: "Teacher Name" } });
    fireEvent.change(screen.getByLabelText("Wallet provider"), { target: { value: "Wallet Co" } });
    fireEvent.change(screen.getByLabelText("Wallet phone"), { target: { value: "01000000000" } });
    const saveButton = screen.getByRole("button", { name: "Save payout profile" });
    fireEvent.click(saveButton);
    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);
    expect(mocks.updatePayout).toHaveBeenCalledTimes(1);

    rejectSave(new Error("failed"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save payout profile.");
    expect(mocks.toastError).toHaveBeenCalled();
  });
});
