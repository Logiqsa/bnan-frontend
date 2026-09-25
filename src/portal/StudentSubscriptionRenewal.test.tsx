import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentSubscriptionRenewal from "./StudentSubscriptionRenewal";

const mocks = vi.hoisted(() => ({
  subscriptions: vi.fn(),
  home: vi.fn(),
  packages: vi.fn(),
  createEgyptian: vi.fn(),
  egyptianStatus: vi.fn(),
  createGulf: vi.fn(),
  saveRenewal: vi.fn(),
}));
vi.mock("@/api/studentSubscriptionApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/studentSubscriptionApi")>()), studentSubscriptionApi: { get: mocks.subscriptions } }));
vi.mock("@/api/studentHomeApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/studentHomeApi")>()), studentHomeApi: { get: mocks.home } }));
vi.mock("@/api/catalogApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/catalogApi")>()), catalogApi: { packages: mocks.packages } }));
vi.mock("@/api/subscriptionRenewalApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/subscriptionRenewalApi")>()), subscriptionRenewalApi: { createEgyptianRenewal: mocks.createEgyptian, getEgyptianRenewalStatus: mocks.egyptianStatus, createGulfRenewal: mocks.createGulf } }));
vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { saveRenewal: mocks.saveRenewal } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const subscription = {
  id: "subscription-1",
  package: { id: "old-package", name: "الباقة القديمة", type: "hours", accessScope: "single_subject" },
  packageType: "hours",
  accessScope: "single_subject",
  subject: { id: "subject-1", name: "الرياضيات" },
  canRenew: true,
  hasPendingRenewal: false,
};
const home = { student: { id: "student-1", userId: "user-1", curriculum: { id: "curriculum-1", name: "المنهج", registrationMode: "egyptian" } }, subscription: null, subscriptions: [], stats: {}, generatedAt: "2026-09-23" };
const packages = [
  { id: "package-1", name: "باقة 20 ساعة", curriculum: "curriculum-1", type: "hours", accessScope: "single_subject", hours: 20, price: 500, currency: "EGP", isPopular: true, isActive: true },
  { id: "inactive-package", name: "باقة غير نشطة", curriculum: "curriculum-1", type: "hours", accessScope: "single_subject", hours: 10, price: 250, currency: "EGP", isActive: false },
];

const renderPage = (id = "subscription-1") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { ...render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={[`/portal/student/subscriptions/${id}/renew`]}><Routes><Route path="/portal/student/subscriptions/:subscriptionId/renew" element={<StudentSubscriptionRenewal />} /></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>), invalidate };
};

describe("StudentSubscriptionRenewal", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.subscriptions.mockReset().mockResolvedValue({ subscription, subscriptions: [subscription] });
    mocks.home.mockReset().mockResolvedValue(home);
    mocks.packages.mockReset().mockResolvedValue({ success: true, data: packages });
    mocks.createEgyptian.mockReset();
    mocks.egyptianStatus.mockReset();
    mocks.createGulf.mockReset();
    mocks.saveRenewal.mockReset();
  });

  it("loads the selected subscription and active packages using the backend curriculum id", async () => {
    renderPage();
    expect(await screen.findByText("باقة 20 ساعة")).toBeInTheDocument();
    expect(mocks.packages).toHaveBeenCalledWith("curriculum-1");
    expect(screen.queryByText("باقة غير نشطة")).not.toBeInTheDocument();
    expect(screen.getByText("عدد الساعات: 20")).toBeInTheDocument();
    expect(screen.getByText("500 EGP")).toBeInTheDocument();
    expect(screen.getByText("الأكثر شيوعًا")).toBeInTheDocument();
  });

  it("does not auto-select a package and shows selection-required feedback", async () => {
    renderPage();
    const option = await screen.findByRole("radio", { name: /باقة 20 ساعة/ });
    expect(option).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التجديد" }));
    expect(screen.getByText("اختر باقة تجديد متاحة أولًا.")).toBeInTheDocument();
  });

  it("preserves the original private subscription and subject as non-editable context", async () => {
    const { container } = renderPage();
    expect(await screen.findByText("الرياضيات")).toBeInTheDocument();
    expect(container.querySelector('input[name="subscriptionId"]')).toHaveValue("subscription-1");
    expect(container.querySelector('input[name="subjectId"]')).toHaveValue("subject-1");
    expect(screen.queryByRole("combobox", { name: /المادة/ })).not.toBeInTheDocument();
  });

  it("rejects an unknown subscription id without loading packages", async () => {
    renderPage("unknown");
    expect(await screen.findByText("لم يتم العثور على الاشتراك المطلوب")).toBeInTheDocument();
    expect(mocks.packages).not.toHaveBeenCalled();
  });

  it("blocks continuation when registrationMode is missing", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { id: "curriculum-1", name: "المنهج" } } });
    renderPage();
    expect(await screen.findByText("تعذر تحديد نظام تسجيل الطالب")).toBeInTheDocument();
    expect(mocks.packages).not.toHaveBeenCalled();
  });

  it("renders Egyptian foundation fields without receipt or Gulf providers", async () => {
    renderPage();
    await screen.findByText("باقة 20 ساعة");
    expect(screen.getByLabelText("كود الخصم (اختياري)")).toBeInTheDocument();
    expect(screen.getByLabelText("طريقة الدفع")).toBeInTheDocument();
    expect(screen.getByLabelText("رقم المرجع (اختياري)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/إيصال/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tamara|تمارا|Paymob|باي موب/i)).not.toBeInTheDocument();
  });

  it("submits an Egyptian private renewal without student, receipt, or FormData", async () => {
    mocks.createEgyptian.mockResolvedValue({ paymentId: "egyptian-1", purpose: "renewal", status: "pending", amount: 450, originalAmount: 500, discountAmount: 50, currency: "EGP", method: "other", payment: {}, package: "package-1" });
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.change(screen.getByLabelText("كود الخصم (اختياري)"), { target: { value: "SAVE10" } });
    fireEvent.change(screen.getByLabelText("رقم المرجع (اختياري)"), { target: { value: "REF-1" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التجديد" }));
    await waitFor(() => expect(mocks.createEgyptian).toHaveBeenCalledTimes(1));
    const body = mocks.createEgyptian.mock.calls[0][0];
    expect(body).toEqual({ packageId: "package-1", subscriptionId: "subscription-1", subjectId: "subject-1", discountCode: "SAVE10", method: "other", referenceNumber: "REF-1" });
    expect(body).not.toHaveProperty("studentId");
    expect(body).not.toHaveProperty("receipt");
    expect(body).not.toBeInstanceOf(FormData);
    expect(await screen.findByText("تم إرسال طلب التجديد، وهو الآن قيد مراجعة الإدارة.")).toBeInTheDocument();
  });

  it("refreshes Egyptian status and only treats completed as completed", async () => {
    mocks.createEgyptian.mockResolvedValue({ paymentId: "egyptian-1", purpose: "renewal", status: "pending", amount: 500, originalAmount: 500, discountAmount: 0, currency: "EGP", method: "other", payment: {}, package: "package-1" });
    mocks.egyptianStatus.mockResolvedValue({ paymentId: "egyptian-1", purpose: "renewal", status: "completed", amount: 500, originalAmount: 500, discountAmount: 0, currency: "EGP", method: "other", payment: {}, package: "package-1", subscription: { id: "new-subscription" } });
    const { invalidate } = renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التجديد" }));
    await screen.findByText("قيد مراجعة الإدارة");
    fireEvent.click(screen.getByRole("button", { name: "تحديث الحالة" }));
    expect(await screen.findByText("تم تجديد الاشتراك")).toBeInTheDocument();
    expect(mocks.egyptianStatus).toHaveBeenCalledWith("egyptian-1");
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it("shows the backend rejection reason", async () => {
    mocks.createEgyptian.mockResolvedValue({ paymentId: "egyptian-1", purpose: "renewal", status: "pending", amount: 500, originalAmount: 500, discountAmount: 0, currency: "EGP", method: "other", payment: {}, package: "package-1" });
    mocks.egyptianStatus.mockResolvedValue({ paymentId: "egyptian-1", purpose: "renewal", status: "rejected", rejectionReason: "بيانات الدفع غير صحيحة", amount: 500, originalAmount: 500, discountAmount: 0, currency: "EGP", method: "other", payment: {}, package: "package-1" });
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التجديد" }));
    await screen.findByText("قيد مراجعة الإدارة");
    fireEvent.click(screen.getByRole("button", { name: "تحديث الحالة" }));
    expect(await screen.findByText("بيانات الدفع غير صحيحة")).toBeInTheDocument();
  });

  it("prevents duplicate Egyptian submissions", async () => {
    mocks.createEgyptian.mockReturnValue(new Promise(() => undefined));
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    const submit = screen.getByRole("button", { name: "إرسال طلب التجديد" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.createEgyptian).toHaveBeenCalledTimes(1));
  });

  it("prevents duplicate Gulf checkout submissions", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { ...home.student.curriculum, registrationMode: "gulf" } } });
    mocks.createGulf.mockReturnValue(new Promise(() => undefined));
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Paymob/ }));
    const submit = screen.getByRole("button", { name: "المتابعة إلى الدفع" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.createGulf).toHaveBeenCalledTimes(1));
  });

  it("reuses the same Gulf idempotency key when retrying after an API failure", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { ...home.student.curriculum, registrationMode: "gulf" } } });
    mocks.createGulf.mockRejectedValue(new Error("checkout unavailable"));
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Paymob/ }));
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await waitFor(() => expect(mocks.createGulf).toHaveBeenCalledTimes(2));
    expect(mocks.createGulf.mock.calls[0][1]).toBe(mocks.createGulf.mock.calls[1][1]);
  });

  it("creates Paymob checkout without an address and stores a renewal draft", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { ...home.student.curriculum, registrationMode: "gulf" } } });
    mocks.createGulf.mockResolvedValue({ paymentId: "gulf-1", checkoutUrl: "https://pay.test/renewal", status: "pending", originalAmount: 500, discountAmount: 0, finalAmount: 500, currency: "SAR" });
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Paymob/ }));
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await waitFor(() => expect(mocks.createGulf).toHaveBeenCalledTimes(1));
    const [body, key] = mocks.createGulf.mock.calls[0];
    expect(body).toEqual({ packageId: "package-1", subscriptionId: "subscription-1", subjectId: "subject-1", provider: "paymob", locale: "ar_SA", isMobile: false });
    expect(body).not.toHaveProperty("paymentAddress");
    expect(body).not.toHaveProperty("studentId");
    expect(key).toEqual(expect.any(String));
    expect(mocks.saveRenewal).toHaveBeenCalledWith({ paymentId: "gulf-1", provider: "paymob", checkoutUrl: "https://pay.test/renewal", createdAt: expect.any(Number) });
  });

  it("requires Tamara address and sends it without changing the original subject", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { ...home.student.curriculum, registrationMode: "gulf" } } });
    mocks.createGulf.mockResolvedValue({ paymentId: "gulf-1", checkoutUrl: "https://pay.test/renewal", status: "pending", originalAmount: 500, discountAmount: 0, finalAmount: 500, currency: "SAR" });
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("radio", { name: "تمارا" }));
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("أكمل بيانات عنوان الدفع المطلوبة لتمارا");
    expect(mocks.createGulf).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("المدينة *"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByLabelText("المنطقة *"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByLabelText("العنوان التفصيلي *"), { target: { value: "شارع الملك" } });
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await waitFor(() => expect(mocks.createGulf).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: "subscription-1", subjectId: "subject-1", provider: "tamara", paymentAddress: { city: "الرياض", region: "الرياض", line1: "شارع الملك" } }), expect.any(String)));
  });

  it("does not save or redirect an incomplete Gulf checkout response", async () => {
    mocks.home.mockResolvedValue({ ...home, student: { ...home.student, curriculum: { ...home.student.curriculum, registrationMode: "gulf" } } });
    mocks.createGulf.mockResolvedValue({ paymentId: "gulf-1", checkoutUrl: "", status: "pending" });
    renderPage();
    fireEvent.click(await screen.findByRole("radio", { name: /باقة 20 ساعة/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Paymob/ }));
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("استجابة الدفع غير مكتملة");
    expect(mocks.saveRenewal).not.toHaveBeenCalled();
  });
});
