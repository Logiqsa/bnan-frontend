import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentAddSubject from "./StudentAddSubject";

const mocks = vi.hoisted(() => ({
  available: vi.fn(),
  packages: vi.fn(),
  checkout: vi.fn(),
  requestAdditional: vi.fn(),
  saveDraft: vi.fn(),
}));

vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/api/studentSubjectRequestsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentSubjectRequestsApi")>()),
  studentSubjectRequestsApi: {
    availableSubjects: mocks.available,
    checkout: mocks.checkout,
    requestAdditional: mocks.requestAdditional,
  },
}));
vi.mock("@/api/catalogApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/catalogApi")>()),
  catalogApi: { packages: mocks.packages },
}));
vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { saveSubjectRequest: mocks.saveDraft } }));

const response = {
  curriculum: { id: "curriculum-1", name: "المنهج الخليجي", registrationMode: "gulf" },
  grade: { id: "grade-1", name: "الصف الأول" },
  subjects: [
    { id: "subject-1", name: "الرياضيات", isSelectable: true, requestStatus: null },
    { id: "subject-2", name: "العلوم", isSelectable: false, requestStatus: "pending" },
    { id: "subject-3", name: "العربية", isSelectable: true, requestStatus: null },
  ],
};
const packages = [
  { id: "package-1", name: "عشر ساعات", curriculum: "curriculum-1", type: "hours", accessScope: "single_subject", hours: 10, price: 450, currency: "SAR", isActive: true },
  { id: "package-disabled", name: "قديمة", curriculum: "curriculum-1", accessScope: "single_subject", price: 100, currency: "SAR", isActive: false },
];

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentAddSubject /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

const loadPage = async () => {
  renderPage();
  await screen.findByText("الرياضيات");
  await screen.findByText("عشر ساعات");
};

describe("StudentAddSubject", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.available.mockReset().mockResolvedValue(response);
    mocks.packages.mockReset().mockResolvedValue({ success: true, data: packages });
    mocks.checkout.mockReset();
    mocks.requestAdditional.mockReset();
    mocks.saveDraft.mockReset();
  });

  it("loads subjects and packages using the returned curriculum and exposes only valid choices", async () => {
    await loadPage();
    expect(mocks.packages).toHaveBeenCalledWith("curriculum-1");
    expect(screen.getByRole("radio", { name: /الرياضيات/ })).toBeEnabled();
    expect(screen.getByRole("radio", { name: /العلوم/ })).toBeDisabled();
    expect(screen.queryByText("قديمة")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /عشر ساعات/ })).toHaveAccessibleName(/٤٥٠/);
    expect(screen.getByText("10 ساعة")).toBeInTheDocument();
  });

  it("keeps subject selection single and sends the selected IDs once", async () => {
    mocks.checkout.mockReturnValue(new Promise(() => undefined));
    await loadPage();
    fireEvent.click(screen.getByRole("radio", { name: /الرياضيات/ }));
    fireEvent.click(screen.getByRole("radio", { name: /العربية/ }));
    fireEvent.click(screen.getByRole("radio", { name: /عشر ساعات/ }));
    const submit = screen.getByRole("button", { name: "المتابعة إلى الدفع" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    expect(mocks.checkout.mock.calls[0][0]).toEqual({ subjectId: "subject-3", packageId: "package-1", provider: "paymob", locale: "ar_SA", isMobile: false });
  });

  it("shows Tamara address only for Tamara and sends its exact optional payload", async () => {
    mocks.checkout.mockReturnValue(new Promise(() => undefined));
    await loadPage();
    expect(screen.queryByLabelText("المدينة *")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "تمارا" }));
    expect(screen.getByLabelText("المدينة *")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /الرياضيات/ }));
    fireEvent.click(screen.getByRole("radio", { name: /عشر ساعات/ }));
    fireEvent.change(screen.getByLabelText("المدينة *"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByLabelText("المنطقة *"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByLabelText("العنوان التفصيلي *"), { target: { value: "شارع الملك" } });
    fireEvent.change(screen.getByLabelText("ملاحظات (اختياري)", { selector: "textarea" }), { target: { value: "ملاحظة" } });
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    expect(mocks.checkout.mock.calls[0][0]).toEqual({
      subjectId: "subject-1", packageId: "package-1", provider: "tamara", notes: "ملاحظة",
      paymentAddress: { city: "الرياض", region: "الرياض", line1: "شارع الملك" }, locale: "ar_SA", isMobile: false,
    });
  });

  it("uses backend registrationMode for the Egyptian request flow without payment", async () => {
    mocks.available.mockResolvedValue({
      ...response,
      curriculum: { ...response.curriculum, registrationMode: "egyptian" },
    });
    mocks.requestAdditional.mockResolvedValue([{ subjectRequestId: "request-1", subject: { id: "subject-1", name: "الرياضيات" }, status: "awaiting_admin_approval" }]);
    await loadPage();
    expect(screen.queryByRole("radio", { name: "تمارا" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Paymob/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /الرياضيات/ }));
    fireEvent.click(screen.getByRole("radio", { name: /عشر ساعات/ }));
    fireEvent.change(screen.getByLabelText("ملاحظات (اختياري)", { selector: "textarea" }), { target: { value: "طلب مصري" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب المادة" }));
    await waitFor(() => expect(mocks.requestAdditional).toHaveBeenCalledWith({ subjectIds: ["subject-1"], packageId: "package-1", notes: "طلب مصري" }));
    expect(await screen.findByText("الطلب في انتظار مراجعة الإدارة والموافقة عليه.")).toBeInTheDocument();
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("saves a purpose-specific draft only after a valid checkout response", async () => {
    mocks.checkout.mockResolvedValue({ paymentId: "payment-1", checkoutUrl: "https://pay.test", status: "pending" });
    await loadPage();
    fireEvent.click(screen.getByRole("radio", { name: /الرياضيات/ }));
    fireEvent.click(screen.getByRole("radio", { name: /عشر ساعات/ }));
    fireEvent.click(screen.getByRole("button", { name: "المتابعة إلى الدفع" }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ paymentId: "payment-1", provider: "paymob", checkoutUrl: "https://pay.test", createdAt: expect.any(Number) })));
    expect(mocks.saveDraft.mock.calls[0][0]).not.toHaveProperty("password");
    expect(mocks.saveDraft.mock.calls[0][0]).not.toHaveProperty("studentEmail");
  });

  it("shows empty and retryable error states", async () => {
    mocks.available.mockResolvedValueOnce({ ...response, subjects: [] });
    const empty = renderPage();
    expect(await screen.findByText("لا توجد مواد متاحة للإضافة حاليًا")).toBeInTheDocument();
    empty.unmount();
    mocks.available.mockRejectedValueOnce(new Error("failed")).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce(response);
    renderPage();
    expect(await screen.findByText("تعذر تحميل المواد المتاحة", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("الرياضيات")).toBeInTheDocument();
  });
});
