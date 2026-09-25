import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentCourseEnrollmentReturn from "./StudentCourseEnrollmentReturn";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "student-1", role: "student" }, loading: false } as { user: { id: string; role: string } | null; loading: boolean },
  read: vi.fn(),
  clear: vi.fn(),
  enrollments: vi.fn(),
}));

vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { read: mocks.read, clear: mocks.clear } }));
vi.mock("@/api/coursesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/coursesApi")>()),
  coursesApi: { myEnrollments: mocks.enrollments },
}));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => mocks.auth }));

const draft = { purpose: "course_enrollment", paymentId: "payment-1", provider: "paymob", checkoutUrl: "https://pay.test/course", courseId: "course-1", mode: "group", createdAt: Date.now() };
const row = (status: string, payment: string | { id: string } = "payment-1") => ({ id: `new-${status}`, course: "course-1", payment, mode: "group", status, price: 500, currency: "SAR" });

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><MemoryRouter><StudentCourseEnrollmentReturn /></MemoryRouter></QueryClientProvider>);
  return { invalidate };
};

describe("StudentCourseEnrollmentReturn", () => {
  beforeEach(() => {
    mocks.auth.user = { id: "student-1", role: "student" };
    mocks.auth.loading = false;
    mocks.read.mockReset().mockReturnValue(draft);
    mocks.clear.mockReset();
    mocks.enrollments.mockReset();
  });

  it("requires an authenticated Student and never introduces Parent access", () => {
    mocks.auth.user = null;
    renderPage();
    expect(screen.getByText("يلزم تسجيل دخول الطالب")).toBeInTheDocument();
    expect(mocks.enrollments).not.toHaveBeenCalled();
  });

  it("matches by payment id and treats only an active enrollment as success", async () => {
    mocks.enrollments.mockResolvedValue([row("completed", "other-payment"), row("active", { id: "payment-1" })]);
    const { invalidate } = renderPage();
    expect(await screen.findByText("تم إعادة الاشتراك في الدورة بنجاح")).toBeInTheDocument();
    await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["my-course-enrollments"] });
  });

  it("keeps a pending enrollment in processing and supports manual refresh", async () => {
    mocks.enrollments.mockResolvedValue([row("pending")]);
    renderPage();
    expect(await screen.findByText("تم إنشاء التسجيل، وما زال الدفع قيد التأكيد.")).toBeInTheDocument();
    expect(screen.queryByText("تم إعادة الاشتراك في الدورة بنجاح")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /تحقق مرة أخرى/ }));
    await waitFor(() => expect(mocks.enrollments).toHaveBeenCalledTimes(2));
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it.each(["cancelled", "refunded", "expired", "removed"])("shows terminal non-success for %s", async (status) => {
    mocks.enrollments.mockResolvedValue([row(status)]);
    renderPage();
    expect(await screen.findByText("لم تكتمل إعادة الاشتراك")).toBeInTheDocument();
    expect(screen.queryByText("تم إعادة الاشتراك في الدورة بنجاح")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
  });

  it("keeps a missing matching enrollment in verification without fake success", async () => {
    mocks.enrollments.mockResolvedValue([row("active", "different-payment")]);
    renderPage();
    expect(await screen.findByText("لم يظهر التسجيل المرتبط بعملية الدفع بعد.")).toBeInTheDocument();
    expect(screen.queryByText("تم إعادة الاشتراك في الدورة بنجاح")).not.toBeInTheDocument();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
