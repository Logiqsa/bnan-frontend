import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import NotificationsBell from "./NotificationsBell";

const mocks = vi.hoisted(() => ({
  markRead: vi.fn().mockResolvedValue(undefined),
  deleteNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/contexts/notifications-context", () => ({
  useNotificationsContext: () => ({
    items: [{
      id: "notification-1",
      type: "salary",
      key: "TEACHER_PAYROLL_STATEMENT_SENT",
      title: "كشف مستحقات جديد",
      body: "تم إرسال كشف مستحقاتك",
      isRead: false,
      status: "unread",
      createdAt: "2026-09-30T10:00:00.000Z",
      navigation: {
        target: "teacher_payroll_statement",
        params: { statementId: "statement-1" },
      },
    }],
    unreadCount: 1,
    loading: false,
    error: null,
    reload: vi.fn(),
    markRead: mocks.markRead,
    markAllRead: vi.fn(),
    deleteNotification: mocks.deleteNotification,
  }),
}));
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ isArabic: true, pick: (ar: string) => ar }),
}));

const Location = () => <span data-testid="location">{useLocation().pathname}</span>;

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

describe("NotificationsBell", () => {
  it("shows a Teacher Payroll notification and opens its statement", async () => {
    render(
      <MemoryRouter initialEntries={["/portal/teacher"]}>
        <NotificationsBell role="teacher" />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "فتح الإشعارات" }));
    expect(await screen.findByText("كشف مستحقات جديد")).toBeInTheDocument();
    fireEvent.click(screen.getByText("كشف مستحقات جديد"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/portal/teacher/payroll-statements/statement-1",
    );
    expect(mocks.markRead).toHaveBeenCalledWith("notification-1");
  });

  it("deletes a notification after confirmation without navigating", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <NotificationsBell role="admin" />
        <Routes><Route path="*" element={<Location />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "فتح الإشعارات" }));
    fireEvent.click(await screen.findByRole("button", { name: "حذف الإشعار" }));
    expect(await screen.findByText("هل تريد حذف هذا الإشعار؟ لن يظهر لك مرة أخرى، ولن يتأثر باقي المستلمين.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));

    expect(mocks.deleteNotification).toHaveBeenCalledWith("notification-1");
    expect(screen.getByTestId("location")).toHaveTextContent("/admin");
  });
});
