import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import StudentSubscriptions from "./StudentSubscriptions";

const mocks = vi.hoisted(() => ({ get: vi.fn(), history: vi.fn() }));
vi.mock("@/api/studentSubscriptionApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/studentSubscriptionApi")>()), studentSubscriptionApi: { get: mocks.get, getHistory: mocks.history } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const hourly = {
  id: "h1", package: { name: "باقة العلوم", type: "hours", accessScope: "single_subject", currency: "SAR" },
  packageType: "hours", accessScope: "single_subject", subject: { id: "s1", name: "العلوم" },
  computedStatus: "active", isActive: true, purchasedHours: 20, usedHours: 8, remainingHours: 12,
  progressPercentage: 40, paidPrice: 300, canRenew: true, hasPendingRenewal: false,
  startDate: "2026-09-01T00:00:00.000Z",
};
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Location = () => <span data-testid="location">{useLocation().pathname}</span>;
  return render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={["/portal/student/subscriptions"]}><Routes><Route path="/portal/student/subscriptions" element={<><StudentSubscriptions /><Location /></>} /><Route path="/portal/student/subscriptions/:subscriptionId/renew" element={<Location />} /></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
};

describe("StudentSubscriptions", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.get.mockReset(); mocks.history.mockReset().mockResolvedValue({ data: [], pagination: { current_page: 1, last_page: 1, per_page: 10, total: 0 } }); });

  it("renders backend-provided hourly fields, subject and renewal state", async () => {
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly] });
    renderPage();
    expect(await screen.findByText("باقة العلوم")).toBeInTheDocument();
    expect(screen.getByText("العلوم")).toBeInTheDocument();
    expect(screen.getByText("إجمالي الساعات")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("هذا الاشتراك متاح للتجديد.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تجديد الاشتراك" })).toBeInTheDocument();
    expect(screen.queryByText(/إلغاء الاشتراك/)).not.toBeInTheDocument();
  });

  it("renders monthly fields, dates, all-subject scope and pending renewal", async () => {
    const monthly = { id: "m1", package: { name: "الشهرية", type: "monthly", accessScope: "all_subjects" }, packageType: "monthly", accessScope: "all_subjects", computedStatus: "grace_period", purchasedMonths: 3, startDate: "2026-08-01", endDate: "2026-11-01", gracePeriodEndsAt: "2026-11-08", hasPendingRenewal: true };
    mocks.get.mockResolvedValue({ subscription: monthly, subscriptions: [monthly] });
    renderPage();
    expect(await screen.findByText("الشهرية")).toBeInTheDocument();
    expect(screen.getByText(/كل المواد/)).toBeInTheDocument();
    expect(screen.getByText("الأشهر المشتراة")).toBeInTheDocument();
    expect(screen.getByText("نهاية فترة السماح", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("يوجد طلب تجديد قيد المراجعة")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "تجديد الاشتراك" })).not.toBeInTheDocument();
  });

  it("hides renewal for an ineligible subscription", async () => {
    const subscription = { ...hourly, canRenew: false };
    mocks.get.mockResolvedValue({ subscription, subscriptions: [subscription] });
    renderPage();
    await screen.findByText("باقة العلوم");
    expect(screen.queryByRole("link", { name: "تجديد الاشتراك" })).not.toBeInTheDocument();
  });

  it("groups every live subscription as current and only ended subscriptions as previous", async () => {
    const secondCurrent = { ...hourly, id: "h2", package: { ...hourly.package, name: "باقة الرياضيات" }, subject: { id: "s2", name: "الرياضيات" }, computedStatus: "grace_period", isActive: true };
    const suspendedCurrent = { ...hourly, id: "h3", package: { ...hourly.package, name: "باقة موقوفة مؤقتًا" }, computedStatus: "suspended", isActive: false };
    const expired = { ...hourly, id: "old1", package: { ...hourly.package, name: "باقة منتهية" }, computedStatus: "expired", isActive: false, canRenew: true };
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly, secondCurrent, suspendedCurrent, expired] });

    renderPage();

    expect(await screen.findByText("الاشتراكات الحالية")).toBeInTheDocument();
    expect(screen.getByText("الاشتراكات السابقة")).toBeInTheDocument();
    const currentSection = screen.getByText("الاشتراكات الحالية").closest("section");
    const previousSection = screen.getByText("الاشتراكات السابقة").closest("section");
    expect(currentSection).toHaveTextContent("باقة العلوم");
    expect(currentSection).toHaveTextContent("باقة الرياضيات");
    expect(currentSection).toHaveTextContent("باقة موقوفة مؤقتًا");
    expect(currentSection).not.toHaveTextContent("باقة منتهية");
    expect(previousSection).toHaveTextContent("باقة منتهية");
    expect(previousSection).not.toHaveTextContent("باقة الرياضيات");
    expect(screen.getAllByText("حالي")).toHaveLength(3);
    expect(screen.queryByText("الحالي / الأحدث")).not.toBeInTheDocument();
  });

  it("navigates an eligible subscription to its renewal route", async () => {
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly] });
    renderPage();
    fireEvent.click(await screen.findByRole("link", { name: "تجديد الاشتراك" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/portal/student/subscriptions/h1/renew");
  });

  it("does not derive missing remaining hours or progress", async () => {
    mocks.get.mockResolvedValue({ subscription: { ...hourly, usedHours: 8, remainingHours: undefined, progressPercentage: undefined }, subscriptions: [{ ...hourly, usedHours: 8, remainingHours: undefined, progressPercentage: undefined }] });
    renderPage();
    await screen.findByText("باقة العلوم");
    expect(screen.queryByText("الساعات المتبقية")).not.toBeInTheDocument();
    expect(screen.queryByText("التقدم")).not.toBeInTheDocument();
  });

  it.each([["active", "نشط"], ["grace_period", "فترة سماح"], ["suspended", "موقوف"], ["expired", "منتهي"], ["cancelled", "ملغي"]])("renders backend status %s as a subscription state", async (status, label) => {
    const subscription = { ...hourly, id: status, computedStatus: status, isActive: status === "active" };
    mocks.get.mockResolvedValue({ subscription, subscriptions: [subscription] });
    renderPage();
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByText("لا يوجد اشتراك حالي")).not.toBeInTheDocument();
  });

  it("shows an unknown raw status safely", async () => {
    const subscription = { ...hourly, computedStatus: "future_state" };
    mocks.get.mockResolvedValue({ subscription, subscriptions: [subscription] });
    renderPage();
    expect(await screen.findByText("future_state")).toBeInTheDocument();
  });

  it("shows loading and empty states", async () => {
    mocks.get.mockReturnValue(new Promise(() => undefined));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل الاشتراكات")).toBeInTheDocument();
    loading.unmount();
    mocks.get.mockResolvedValue({ subscription: null, subscriptions: [] });
    renderPage();
    expect(await screen.findByText("لا يوجد اشتراك حالي")).toBeInTheDocument();
  });

  it("shows an API error and retries", async () => {
    mocks.get.mockRejectedValueOnce(new Error("failed")).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce({ subscription: hourly, subscriptions: [hourly] });
    renderPage();
    expect(await screen.findByText("تعذر تحميل بيانات الاشتراك", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("باقة العلوم")).toBeInTheDocument();
  });

  it("renders a separate backend-provided history without recalculating status", async () => {
    const historyItem = { id: "internal-id", package: { name: "باقة تاريخية", type: "monthly", accessScope: "all_subjects", currency: "SAR" }, packageType: "monthly", accessScope: "all_subjects", subject: { id: "subject-id", name: "التاريخ" }, status: "expired", computedStatus: "backend_state", paidPrice: 120, startDate: "2025-01-01", endDate: "2025-02-01", renewedFrom: { id: "renewal-id" } };
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly] });
    mocks.history.mockResolvedValue({ data: [historyItem], pagination: { current_page: 1, last_page: 2, per_page: 10, total: 11 } });
    renderPage();
    expect(await screen.findByText("سجل الاشتراكات")).toBeInTheDocument();
    expect(await screen.findByText("باقة تاريخية")).toBeInTheDocument();
    expect(screen.getByText(/الحالة المحسوبة: backend_state/)).toBeInTheDocument();
    expect(screen.queryByText("renewal-id")).not.toBeInTheDocument();
    expect(screen.queryByText("internal-id")).not.toBeInTheDocument();
    expect(screen.getByText(/صفحة 1 من 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "التالي" })).toBeEnabled();
  });

  it("passes the selected status, resets page, and handles filtered empty history", async () => {
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly] });
    mocks.history.mockImplementation(({ page, limit, status }: { page: number; limit: number; status?: string }) => Promise.resolve({ data: page === 1 && status === "expired" ? [] : [hourly], pagination: { current_page: page, last_page: 2, per_page: limit, total: page === 1 && status === "expired" ? 0 : 11 } }));
    renderPage();
    const filter = await screen.findByRole("combobox", { name: "فلترة سجل الاشتراكات بالحالة" });
    fireEvent.change(filter, { target: { value: "expired" } });
    await waitFor(() => expect(mocks.history).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: "expired" }));
    expect(await screen.findByText("لا توجد اشتراكات بهذه الحالة.")).toBeInTheDocument();
  });

  it("shows history loading and error states independently from current subscriptions", async () => {
    mocks.get.mockResolvedValue({ subscription: hourly, subscriptions: [hourly] });
    mocks.history.mockRejectedValue(new Error("history failed"));
    renderPage();
    expect(await screen.findByText("تعذر تحميل سجل الاشتراكات")).toBeInTheDocument();
    expect(screen.getByText("باقة العلوم")).toBeInTheDocument();
  });
});
