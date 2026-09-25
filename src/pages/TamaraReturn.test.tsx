import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TamaraReturn from "./TamaraReturn";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  clear: vi.fn(),
  status: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { read: mocks.read, clear: mocks.clear } }));
vi.mock("@/api/paymentApi", () => ({ paymentApi: { status: mocks.status, reconcile: mocks.reconcile } }));
vi.mock("@/components/AccountVerification", () => ({ default: () => <div>account verification</div> }));

const renderPage = () => render(<MemoryRouter><TamaraReturn kind="success" /></MemoryRouter>);

describe("TamaraReturn purpose isolation", () => {
  beforeEach(() => {
    mocks.read.mockReset();
    mocks.clear.mockReset();
    mocks.status.mockReset();
    mocks.reconcile.mockReset();
  });

  it("continues the registration status flow", async () => {
    mocks.read.mockReturnValue({
      purpose: "registration",
      paymentId: "registration-payment",
      provider: "paymob",
      checkoutUrl: "https://pay.test",
      createdAt: Date.now(),
    });
    mocks.status.mockResolvedValue({ data: { paymentId: "registration-payment", status: "pending" } });

    const view = renderPage();

    await waitFor(() => expect(mocks.status).toHaveBeenCalledWith("paymob", "registration-payment"));
    expect(screen.getByText("جاري تأكيد عملية الدفع...")).toBeInTheDocument();
    view.unmount();
  });

  it.each([
    ["subject request", { purpose: "subject_request", paymentId: "subject-payment", provider: "tamara", checkoutUrl: "", createdAt: Date.now() }],
    ["missing draft", null],
  ])("does not execute registration behavior for %s", (_label, draft) => {
    mocks.read.mockReturnValue(draft);

    renderPage();

    expect(screen.getByText("لا يوجد طلب دفع نشط")).toBeInTheDocument();
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
