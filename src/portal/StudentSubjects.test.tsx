import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentSubjects from "./StudentSubjects";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/studentSubjectsApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/studentSubjectsApi")>()), studentSubjectsApi: { list: mocks.list } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentSubjects /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentSubjects", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.list.mockReset(); });

  it("renders one or multiple subjects using only returned names", async () => {
    mocks.list.mockResolvedValue([{ id: "s1", name: "الرياضيات" }, { id: "s2", name: "العلوم" }]);
    renderPage();
    expect(await screen.findByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("العلوم")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /إضافة مادة/ })).toHaveAttribute("href", "/portal/student/subjects/add");
    expect(screen.getByRole("link", { name: /طلبات المواد/ })).toHaveAttribute("href", "/portal/student/subject-requests");
    expect(screen.getByRole("link", { name: /طلبات التغيير/ })).toHaveAttribute("href", "/portal/student/change-requests");
  });

  it("renders safely when no optional metadata exists", async () => {
    mocks.list.mockResolvedValue([{ id: "s1", name: "اللغة العربية" }]);
    renderPage();
    expect(await screen.findByText("اللغة العربية")).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/نسبة|تقدم|مدرس|اشتراك/)).not.toBeInTheDocument();
  });

  it("shows loading then a distinct empty state", async () => {
    mocks.list.mockReturnValue(new Promise(() => undefined));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل المواد")).toBeInTheDocument();
    loading.unmount();
    mocks.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("لا توجد مواد مسجلة حاليًا")).toBeInTheDocument();
  });

  it("shows an error and retries the same query", async () => {
    mocks.list.mockRejectedValueOnce(new Error("failed")).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce([{ id: "s1", name: "الرياضيات" }]);
    renderPage();
    expect(await screen.findByText("تعذر تحميل المواد", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("الرياضيات")).toBeInTheDocument();
  });
});
