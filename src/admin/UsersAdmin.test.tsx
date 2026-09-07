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
  listAll: vi.fn(),
  get: vi.fn(),
  regenerate: vi.fn(),
  markVerified: vi.fn(),
  changePassword: vi.fn(),
  listApprovedApplications: vi.fn(),
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
    listAll: mocks.listAll,
    get: mocks.get,
    regenerateVerificationCode: mocks.regenerate,
    markVerified: mocks.markVerified,
    changePassword: mocks.changePassword,
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
vi.mock("@/api/teacherApplicationsApi", () => ({
  teacherApplicationsApi: {
    listAllByStatus: mocks.listApprovedApplications,
    getByUserId: vi.fn(),
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
    mocks.listAll.mockReset().mockResolvedValue([user]);
    mocks.get.mockReset().mockResolvedValue({ success: true, data: user });
    mocks.regenerate
      .mockReset()
      .mockResolvedValue({
        message: "Verification code generated successfully",
        code: "4821",
        expiresAt: "2026-09-05T12:10:00Z",
      });
    mocks.markVerified.mockReset().mockResolvedValue({
      success: true,
      data: { ...user, isVerified: true },
    });
    mocks.changePassword.mockReset().mockResolvedValue({ success: true });
    mocks.listApprovedApplications.mockReset().mockResolvedValue([]);
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

  it("does not change the page size until Apply is clicked", async () => {
    renderPage();
    await screen.findByText("Ahmed");
    expect(mocks.list).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Rows per page" }), {
      target: { value: "50" },
    });
    expect(mocks.list).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(mocks.list).toHaveBeenLastCalledWith("student", 1, undefined, undefined, 50);
  });

  it("lets an admin mark an unverified user as verified", async () => {
    renderPage();
    fireEvent.keyDown(
      await screen.findByRole("button", { name: /Actions for Ahmed/ }),
      { key: "Enter", code: "Enter" },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Mark as verified" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm verification" }));

    await waitFor(() => expect(mocks.markVerified).toHaveBeenCalledWith("user-1"));
    expect(mocks.success).toHaveBeenCalledWith("User marked as verified");
  });

  it("lets an admin change a user's password", async () => {
    renderPage();
    fireEvent.keyDown(
      await screen.findByRole("button", { name: /Actions for Ahmed/ }),
      { key: "Enter", code: "Enter" },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "NewPassword123" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "NewPassword123" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith("user-1", "NewPassword123"));
    expect(mocks.success).toHaveBeenCalledWith("User password changed successfully");
  });

  it("shows only teachers with approved applications on the teachers page", async () => {
    mocks.listAll.mockResolvedValue([
      { ...user, id: "teacher-1", role: "teacher", fullName: "Approved Teacher", email: "approved@bnan.edu" },
      { ...user, id: "teacher-2", role: "teacher", fullName: "Pending Teacher", email: "pending@bnan.edu" },
    ]);
    mocks.listApprovedApplications.mockResolvedValue([
      { id: "application-1", status: "approved", email: "approved@bnan.edu" },
    ]);

    render(
      <LanguageProvider>
        <UsersAdmin title="Teachers" description="Approved teachers" roles={["teacher"]} approvedTeachersOnly />
      </LanguageProvider>,
    );

    expect(await screen.findByText("Approved Teacher")).toBeInTheDocument();
    expect(screen.queryByText("Pending Teacher")).not.toBeInTheDocument();
  });

  it("shows every role in the all-users view and filters the combined list", async () => {
    mocks.listAll.mockImplementation((role: string) =>
      Promise.resolve([
        {
          ...user,
          id: `${role}-1`,
          role,
          fullName: role === "admin" ? "System Admin" : `${role} account`,
        },
      ]),
    );

    render(
      <LanguageProvider>
        <UsersAdmin
          title="All users"
          description="Manage every account"
          roles={["student", "parent", "teacher", "supervisor", "admin"]}
          includeAllRoles
        />
      </LanguageProvider>,
    );

    expect(await screen.findByText("System Admin")).toBeInTheDocument();
    expect(screen.getByText("teacher account")).toBeInTheDocument();
    expect(mocks.listAll).toHaveBeenCalledTimes(5);

    fireEvent.change(screen.getByPlaceholderText("Search by name"), {
      target: { value: "System" },
    });
    await waitFor(() => expect(screen.queryByText("teacher account")).not.toBeInTheDocument());
    expect(screen.getByText("System Admin")).toBeInTheDocument();
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
