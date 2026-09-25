import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studentHomeQueryKey } from "@/api/studentHomeApi";
import { studentSubscriptionsQueryKey } from "@/api/studentSubscriptionApi";
import StudentSubscriptionRenewalReturn from "./StudentSubscriptionRenewalReturn";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "student-1", role: "student" }, loading: false } as {
    user: { id: string; role: string } | null;
    loading: boolean;
  },
  read: vi.fn(),
  clear: vi.fn(),
  status: vi.fn(),
  createEgyptian: vi.fn(),
  createGulf: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/tamaraDraft", () => ({
  gulfPaymentDraftStore: { read: mocks.read, clear: mocks.clear },
}));
vi.mock("@/api/subscriptionRenewalApi", () => ({
  subscriptionRenewalApi: {
    getGulfRenewalStatus: mocks.status,
    createEgyptianRenewal: mocks.createEgyptian,
    createGulfRenewal: mocks.createGulf,
    reconcileGulfRenewal: mocks.reconcile,
  },
}));
vi.mock("@/portal/PortalAuthContext", () => ({
  usePortalAuth: () => mocks.auth,
}));

const draft = {
  purpose: "renewal",
  paymentId: "payment-1",
  provider: "tamara",
  checkoutUrl: "https://pay.test/renewal",
  createdAt: Date.now(),
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <StudentSubscriptionRenewalReturn />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { invalidate };
};

describe("StudentSubscriptionRenewalReturn", () => {
  beforeEach(() => {
    mocks.auth.user = { id: "student-1", role: "student" };
    mocks.auth.loading = false;
    mocks.read.mockReset().mockReturnValue(draft);
    mocks.clear.mockReset();
    mocks.status.mockReset();
    mocks.createEgyptian.mockReset();
    mocks.createGulf.mockReset();
    mocks.reconcile.mockReset();
  });

  it("requires authenticated Student access", () => {
    mocks.auth.user = null;
    renderPage();
    expect(screen.getByText("يلزم تسجيل دخول الطالب")).toBeInTheDocument();
    expect(mocks.status).not.toHaveBeenCalled();
  });

  it("loads status and treats only completed as success", async () => {
    mocks.status.mockResolvedValue({ paymentId: "payment-1", status: "completed" });
    const { invalidate } = renderPage();
    expect(await screen.findByText("تم تجديد الاشتراك بنجاح")).toBeInTheDocument();
    expect(mocks.status).toHaveBeenCalledWith("payment-1");
    expect(mocks.clear).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: studentSubscriptionsQueryKey });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: studentHomeQueryKey });
    });
  });

  it.each(["pending", "authorized", "captured"])(
    "does not treat processing status %s as success",
    async (status) => {
      mocks.status.mockResolvedValue({ paymentId: "payment-1", status });
      const { invalidate } = renderPage();
      expect(await screen.findByText("عملية التجديد قيد المعالجة")).toBeInTheDocument();
      expect(mocks.clear).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it.each(["failed", "cancelled", "expired", "refunded"])(
    "shows terminal non-success status %s without clearing the draft",
    async (status) => {
      mocks.status.mockResolvedValue({ paymentId: "payment-1", status });
      const { invalidate } = renderPage();
      expect(await screen.findByText("لم يكتمل تجديد الاشتراك")).toBeInTheDocument();
      expect(mocks.clear).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("does not create checkout, call Egyptian renewal, or reconcile", async () => {
    mocks.status.mockResolvedValue({ paymentId: "payment-1", status: "pending" });
    renderPage();
    await waitFor(() => expect(mocks.status).toHaveBeenCalledTimes(1));
    expect(mocks.createGulf).not.toHaveBeenCalled();
    expect(mocks.createEgyptian).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
