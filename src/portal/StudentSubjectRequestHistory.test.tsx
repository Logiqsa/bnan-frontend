import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentSubjectRequestHistory from "./StudentSubjectRequestHistory";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/studentSubjectRequestHistoryApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentSubjectRequestHistoryApi")>()),
  studentSubjectRequestHistoryApi: { list: mocks.list },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const request = (status: string, index: number) => ({
  subjectRequestId: `request-${index}`,
  curriculum: { id: "curriculum-1", name: "المنهج المصري", registrationMode: "egyptian" as const },
  subject: { id: `subject-${index}`, name: `مادة ${index}` },
  status,
  notes: index === 1 ? "ملاحظة الطلب" : null,
  requestedAt: "2026-09-23T10:00:00.000Z",
  package: { id: "package-1", name: "باقة المادة", type: "hours", hours: 10, price: 100, currency: "EGP" },
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentSubjectRequestHistory /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentSubjectRequestHistory", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.list.mockReset(); });

  it("shows a skeleton then the empty state with Add Subject navigation", async () => {
    mocks.list.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل طلبات المواد")).toBeInTheDocument();
    loading.unmount();
    mocks.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("لا توجد طلبات مواد حتى الآن")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /إضافة مادة/ })[0]).toHaveAttribute("href", "/portal/student/subjects/add");
  });

  it("renders each supported status and only verified display fields", async () => {
    const statuses = ["awaiting_admin_approval", "pending", "assigned", "rejected", "cancelled"];
    mocks.list.mockResolvedValue(statuses.map(request));
    renderPage();
    for (const label of ["في انتظار موافقة الإدارة", "قيد الانتظار", "تم إسناد الطلب", "مرفوض", "ملغي"]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText("المنهج المصري")).toHaveLength(5);
    expect(screen.getAllByText("باقة المادة")).toHaveLength(5);
    expect(screen.getByText("ملاحظة الطلب")).toBeInTheDocument();
    expect(screen.getAllByText("لا توجد ملاحظات")).toHaveLength(4);
    expect(screen.queryByText(/Paymob|Tamara|حالة الدفع|اسم المعلم|الفصل|الاشتراك/)).not.toBeInTheDocument();
  });

  it("handles missing optional values and an unknown status safely", async () => {
    mocks.list.mockResolvedValue([{ subjectRequestId: "unknown", curriculum: null, subject: null, status: "future_status", notes: null, requestedAt: "invalid", package: null }]);
    renderPage();
    expect(await screen.findByText("المادة غير متاحة")).toBeInTheDocument();
    expect(screen.getByText("حالة غير معروفة")).toBeInTheDocument();
    expect(screen.getByText("لا توجد ملاحظات")).toBeInTheDocument();
    expect(screen.queryByText("future_status")).not.toBeInTheDocument();
  });

  it("shows a friendly error and retries", async () => {
    mocks.list.mockRejectedValueOnce(new Error("failed")).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce([request("pending", 1)]);
    renderPage();
    expect(await screen.findByText("تعذر تحميل طلبات المواد", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("مادة 1")).toBeInTheDocument();
  });
});
