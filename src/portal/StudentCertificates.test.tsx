import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentCertificates from "./StudentCertificates";

const mocks = vi.hoisted(() => ({
  modern: vi.fn(),
  getFile: vi.fn(),
  preview: vi.fn(),
  createObjectURL: vi.fn(() => "blob:pdf"),
  revokeObjectURL: vi.fn(),
  open: vi.fn(),
}));
vi.mock("@/api/studentCertificatesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentCertificatesApi")>()),
  studentCertificatesApi: { getMyCertificates: mocks.modern },
}));
vi.mock("@/api/certificateFilesApi", () => ({
  certificateFilesApi: { getCertificateFile: mocks.getFile },
}));
vi.mock("@/hooks/useProtectedCertificateFile", () => ({
  useProtectedCertificateFile: mocks.preview,
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const modernCertificate = {
  _id: "modern-1",
  certificateNumber: "CERT-2026-0001",
  certificateType: "student_monthly",
  recipient: "user-id",
  recipientSnapshot: { fullName: "أحمد محمد" },
  academicContext: { curriculum: "curriculum-id", curriculumNameSnapshot: "المنهج المصري", grade: "grade-id", gradeNameSnapshot: "الصف الأول", classroom: "classroom-id", classroomNameSnapshot: "فصل أ" },
  period: { month: 9, year: 2026 },
  subjects: [{ subject: "subject-id", nameSnapshot: "الرياضيات", score: 18, maxScore: 20 }],
  totalScore: 18,
  totalMaxScore: 20,
  percentage: 90,
  previewImagePath: "https://api.example.com/uploads/preview.png",
  pdfPath: "https://api.example.com/uploads/certificate.pdf",
  issuedAt: "2026-09-20T10:00:00.000Z",
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentCertificates /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentCertificates", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.modern.mockReset();
    mocks.getFile.mockReset().mockResolvedValue(new Blob(["certificate"], { type: "application/pdf" }));
    mocks.preview.mockReset().mockImplementation((_id: string, _type: "pdf" | "preview", enabled = true) => ({
      url: enabled ? "blob:preview" : null,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    }));
    mocks.createObjectURL.mockClear();
    mocks.revokeObjectURL.mockClear();
    mocks.open.mockReset().mockReturnValue({ location: { href: "about:blank" }, closed: false, close: vi.fn() });
    vi.stubGlobal("URL", { createObjectURL: mocks.createObjectURL, revokeObjectURL: mocks.revokeObjectURL });
    vi.stubGlobal("open", mocks.open);
  });

  it("renders modern metadata and loads preview through the protected file hook", async () => {
    mocks.modern.mockResolvedValue([modernCertificate]);
    renderPage();

    expect(await screen.findByText("CERT-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
    expect(screen.getByText("المنهج المصري")).toBeInTheDocument();
    expect(screen.getByText("الصف الأول")).toBeInTheDocument();
    expect(screen.getByText("فصل أ")).toBeInTheDocument();
    expect(screen.getByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "معاينة الشهادة" })).toHaveAttribute("src", "blob:preview");
    expect(screen.getByRole("img", { name: "معاينة الشهادة" })).not.toHaveAttribute("src", modernCertificate.previewImagePath);
    expect(mocks.preview).toHaveBeenCalledWith("modern-1", "preview", true);
    expect(screen.getByRole("button", { name: "عرض الشهادة" })).toBeInTheDocument();
    expect(mocks.getFile).not.toHaveBeenCalled();
    expect(screen.queryByText(/CourseEnrollment|course-id|classroom-id|subject-id/)).not.toBeInTheDocument();
  });

  it("shows protected preview loading and error retry states", async () => {
    mocks.modern.mockResolvedValue([modernCertificate]);
    mocks.preview.mockReturnValue({ url: null, isLoading: true, error: null, retry: vi.fn() });
    renderPage();
    await screen.findByText("جاري تحميل المعاينة...");
    expect(screen.queryByRole("img", { name: "معاينة الشهادة" })).not.toBeInTheDocument();

    const retry = vi.fn();
    mocks.preview.mockReturnValue({ url: null, isLoading: false, error: new Error("preview failed"), retry });
    renderPage();
    await screen.findByText("تعذر تحميل المعاينة.");
    fireEvent.click(screen.getByRole("button", { name: "إعادة تحميل المعاينة" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("opens PDF through the protected Blob request only after the user clicks", async () => {
    mocks.modern.mockResolvedValue([modernCertificate]);
    renderPage();
    await screen.findByText("CERT-2026-0001");

    expect(mocks.getFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "عرض الشهادة" }));

    await waitFor(() => expect(mocks.getFile).toHaveBeenCalledWith("modern-1", "pdf"));
    expect(mocks.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(screen.queryByRole("link", { name: "عرض الشهادة" })).not.toBeInTheDocument();
  });

  it("shows a PDF error and closes the temporary tab when loading fails", async () => {
    const close = vi.fn();
    mocks.open.mockReturnValue({ location: { href: "about:blank" }, closed: false, close });
    mocks.getFile.mockRejectedValue(new Error("pdf failed"));
    mocks.modern.mockResolvedValue([modernCertificate]);
    renderPage();
    await screen.findByText("CERT-2026-0001");

    fireEvent.click(screen.getByRole("button", { name: "عرض الشهادة" }));

    await screen.findByText("تعذر تحميل الشهادة. حاول مرة أخرى.");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("renders a neutral preview and unsupported type safely", async () => {
    mocks.modern.mockResolvedValue([{ ...modernCertificate, _id: "unexpected", certificateType: "future_student_award", previewImagePath: null, pdfPath: null }]);
    renderPage();
    expect(await screen.findByText("نوع شهادة غير مدعوم")).toBeInTheDocument();
    expect(screen.getByText("future_student_award")).toBeInTheDocument();
    expect(screen.getByText("لا توجد معاينة")).toBeInTheDocument();
  });

  it("keeps the modern loading state without rendering a legacy section", () => {
    mocks.modern.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByLabelText("جاري تحميل الشهادات")).toBeInTheDocument();
    expect(screen.queryByText("الشهادات السابقة")).not.toBeInTheDocument();
  });

  it("shows the modern empty state", async () => {
    mocks.modern.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("لا توجد شهادات حاليًا")).toBeInTheDocument();
    expect(screen.queryByText("الشهادات السابقة")).not.toBeInTheDocument();
  });

  it("shows the modern error state and retries", async () => {
    mocks.modern.mockRejectedValue(new Error("modern failed"));
    renderPage();
    expect(await screen.findByText("تعذر تحميل الشهادات", {}, { timeout: 3_000 })).toBeInTheDocument();
    mocks.modern.mockResolvedValue([modernCertificate]);
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("CERT-2026-0001")).toBeInTheDocument();
    expect(mocks.modern).toHaveBeenCalledTimes(3);
  });

  it("never renders or requests legacy certificates", async () => {
    mocks.modern.mockResolvedValue([modernCertificate]);
    renderPage();
    expect(await screen.findByText("CERT-2026-0001")).toBeInTheDocument();
    expect(screen.queryByText("الشهادات السابقة")).not.toBeInTheDocument();
    expect(screen.queryByText("الشهادات الرسمية")).not.toBeInTheDocument();
  });
});
