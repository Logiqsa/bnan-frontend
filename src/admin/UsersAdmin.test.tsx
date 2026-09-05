import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import UsersAdmin from "./UsersAdmin";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  regenerate: vi.fn(),
  findRegistration: vi.fn(),
  confirmPayment: vi.fn(),
  approveRegistration: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/api/adminUsersApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/adminUsersApi")>()),
  adminUsersApi: {
    list: mocks.list,
    get: mocks.get,
    regenerateVerificationCode: mocks.regenerate,
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
vi.mock("@/api/egyptianRegistrationRequestsApi", () => ({
  egyptianRegistrationRequestsApi: {
    findByUser: mocks.findRegistration,
    confirmPayment: mocks.confirmPayment,
    approve: mocks.approveRegistration,
  },
}));

const user = {
  id: "user-1",
  fullName: "Ahmed",
  email: "teacher@bnan.edu",
  role: "student" as const,
  status: "active" as const,
  isVerified: false,
};
const renderPage = () =>
  render(
    <LanguageProvider>
      <UsersAdmin
        title="Users"
        description="Manage users"
        roles={["student"]}
      />
    </LanguageProvider>,
  );

describe("UsersAdmin verification OTP", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "en");
    mocks.list
      .mockReset()
      .mockResolvedValue({ success: true, data: [user], hasNextPage: false });
    mocks.get.mockReset().mockResolvedValue({ success: true, data: user });
    mocks.regenerate
      .mockReset()
      .mockResolvedValue({
        message: "Verification code generated successfully",
        code: "4821",
        expiresAt: "2026-09-05T12:10:00Z",
      });
    mocks.findRegistration.mockReset().mockResolvedValue(null);
    mocks.confirmPayment.mockReset();
    mocks.approveRegistration.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows the action only for an explicitly unverified user", async () => {
    renderPage();
    expect(await screen.findByText("Unverified")).toBeInTheDocument();
    fireEvent.keyDown(
      await screen.findByRole("button", { name: /Actions for Ahmed/ }),
      { key: "Enter", code: "Enter" },
    );
    expect(
      await screen.findByRole("menuitem", {
        name: /Generate Verification OTP/,
      }),
    ).toBeInTheDocument();
  });

  it("uses the WhatsApp number before the phone number", async () => {
    mocks.list.mockResolvedValue({
      success: true,
      data: [{ ...user, whatsappNumber: "01000000000", phone: "01111111111" }],
      hasNextPage: false,
    });

    renderPage();

    expect(
      await screen.findByRole("link", { name: "Contact Ahmed on WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/201000000000");
  });

  it("lets the admin upload the receipt before approving the student", async () => {
    const registration = {
      studentId: "student-profile-1",
      userId: "user-1",
      registrationStatus: "pending",
      accountStatus: "inactive",
      payment: {
        status: "pending",
        amount: 500,
        currency: "EGP",
        receiptImage: null,
      },
    };
    mocks.findRegistration.mockResolvedValue(registration);
    mocks.confirmPayment.mockResolvedValue({
      success: true,
      data: { payment: { ...registration.payment, status: "confirmed" } },
    });
    mocks.approveRegistration.mockResolvedValue({
      success: true,
      data: {
        student: {
          ...registration,
          registrationStatus: "approved",
          accountStatus: "active",
          payment: { ...registration.payment, status: "confirmed" },
        },
      },
    });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View" }));
    const receipt = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(await screen.findByLabelText("Choose transfer receipt"), {
      target: { files: [receipt] },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Upload receipt and approve student",
      }),
    );

    await waitFor(() =>
      expect(mocks.confirmPayment).toHaveBeenCalledWith("student-profile-1", receipt),
    );
    await waitFor(() =>
      expect(mocks.approveRegistration).toHaveBeenCalledWith(
        "student-profile-1",
      ),
    );
    expect(await screen.findByText("Approved")).toBeInTheDocument();
  });

  it("confirms, displays the response-only code, copies it, and clears it on close", async () => {
    renderPage();
    fireEvent.keyDown(
      await screen.findByRole("button", { name: /Actions for Ahmed/ }),
      { key: "Enter", code: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: /Generate Verification OTP/,
      }),
    );
    const confirmation = await screen.findByRole("alertdialog");
    expect(
      within(confirmation).getByText(/previous code will become invalid/i),
    ).toBeInTheDocument();
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "Generate" }),
    );

    await waitFor(() =>
      expect(mocks.regenerate).toHaveBeenCalledWith(
        "user-1",
        "Internal account has no mailbox",
      ),
    );
    const result = await screen.findByRole("dialog", {
      name: "Verification Code",
    });
    expect(within(result).getByText("4821")).toBeInTheDocument();
    expect(within(result).getByRole("alert")).toHaveTextContent(
      "This code is sensitive",
    );
    fireEvent.click(within(result).getByRole("button", { name: "Copy Code" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("4821"),
    );
    fireEvent.click(
      within(result).getAllByRole("button", { name: "Close" })[0],
    );
    await waitFor(() =>
      expect(screen.queryByText("4821")).not.toBeInTheDocument(),
    );
  });
});
