import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentSubjectRequestReturn from "./StudentSubjectRequestReturn";

const mocks = vi.hoisted(() => ({ read: vi.fn(), clear: vi.fn(), status: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { read: mocks.read, clear: mocks.clear } }));
vi.mock("@/api/studentSubjectRequestsApi", () => ({ studentSubjectRequestsApi: { checkoutStatus: mocks.status, reconcileCheckout: mocks.reconcile } }));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: "student" }, loading: false }) }));
const draft = { purpose: "subject_request", paymentId: "p1", provider: "tamara", checkoutUrl: "", createdAt: Date.now() };
const renderPage = () => render(<MemoryRouter><StudentSubjectRequestReturn /></MemoryRouter>);

describe("StudentSubjectRequestReturn", () => {
  beforeEach(() => { mocks.read.mockReset().mockReturnValue(draft); mocks.clear.mockReset(); mocks.status.mockReset(); mocks.reconcile.mockReset(); });
  it("requires a subject_request draft", () => {
    mocks.read.mockReturnValue({ ...draft, purpose: "registration" });
    renderPage();
    expect(screen.getByText("لا توجد عملية دفع طلب مادة صالحة")).toBeInTheDocument();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("uses server status and shows neutral completed copy", async () => {
    mocks.status.mockResolvedValue({ paymentId: "p1", status: "completed" });
    renderPage();
    expect(await screen.findByText("تم تأكيد الدفع")).toBeInTheDocument();
    expect(screen.getByText(/لا يعني ذلك أن المادة تم تفعيلها/)).toBeInTheDocument();
    expect(mocks.clear).toHaveBeenCalledTimes(1);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("keeps pending drafts and does not trust redirect presence as success", async () => {
    mocks.status.mockResolvedValue({ paymentId: "p1", status: "pending" });
    window.history.replaceState({}, "", "/payment/student-subject-request?paymentStatus=success&orderId=fake");
    renderPage();
    expect(await screen.findByText("عملية الدفع قيد المعالجة")).toBeInTheDocument();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it.each(["failed", "cancelled"])("shows terminal failure for %s", async (status) => {
    mocks.status.mockResolvedValue({ paymentId: "p1", status });
    renderPage();
    expect(await screen.findByText("لم تكتمل عملية الدفع")).toBeInTheDocument();
    await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
  });
});
