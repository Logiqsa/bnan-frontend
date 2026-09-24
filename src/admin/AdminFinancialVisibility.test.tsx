import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminSubscriptions, { AdminSubscriptionDetail } from "./AdminSubscriptions";
import AdminPayments, { AdminPaymentDetail } from "./AdminPayments";

const mocks = vi.hoisted(() => ({ listSubscriptions: vi.fn(), getSubscription: vi.fn(), listPayments: vi.fn(), getPayment: vi.fn() }));
vi.mock("@/api/adminSubscriptionsApi", () => ({ adminSubscriptionsApi: { list: mocks.listSubscriptions, getById: mocks.getSubscription } }));
vi.mock("@/api/adminPaymentsApi", () => ({ adminPaymentsApi: { list: mocks.listPayments, getById: mocks.getPayment } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const subscriptionResponse = { success: true, results: 1, data: [{ id: "sub-1", status: "active", student: { user: { fullName: "طالب" } }, package: { name: "باقة" }, paidPrice: 100, packageType: "hours" }], pagination: { current_page: 2, last_page: 3, per_page: 20, total: 41 } };
const paymentResponse = { success: true, results: 1, data: [{ id: "payment-1", paymentModel: "Payment", status: "completed", amount: 250, currency: "SAR", provider: "tamara", purpose: "renewal", student: { user: { fullName: "طالب" } } }], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 } };
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("Admin financial visibility screens", () => {
  it("renders subscriptions using backend pagination and has no mutation actions", async () => {
    mocks.listSubscriptions.mockResolvedValue(subscriptionResponse);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminSubscriptions /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب")).toBeInTheDocument();
    expect(screen.getByText("صفحة 2 من 3")).toBeInTheDocument();
    expect(screen.queryByText(/استرداد|إلغاء|حذف|تعديل/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(mocks.listSubscriptions).toHaveBeenCalledWith(expect.objectContaining({ page: 3, limit: 20 }));
  });

  it("renders payment list and payment detail without mutation controls", async () => {
    mocks.listPayments.mockResolvedValue(paymentResponse);
    mocks.getPayment.mockResolvedValue(paymentResponse.data[0]);
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/payments/payment-1?paymentModel=gulf"]}><Routes><Route path="/admin/payments" element={<AdminPayments />} /><Route path="/admin/payments/:id" element={<AdminPaymentDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("٢٥٠ SAR")).toBeInTheDocument();
    expect(screen.queryByText(/استرداد|إلغاء|حذف|تعديل/)).not.toBeInTheDocument();
  });

  it("loads a subscription detail route", async () => {
    mocks.getSubscription.mockResolvedValue({ ...subscriptionResponse.data[0], createdAt: "2026-01-01T00:00:00.000Z" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/subscriptions/sub-1"]}><Routes><Route path="/admin/subscriptions/:id" element={<AdminSubscriptionDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("تفاصيل الاشتراك")).toBeInTheDocument();
    expect(screen.getByText("sub-1")).toBeInTheDocument();
  });
});
