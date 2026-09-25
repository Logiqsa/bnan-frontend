import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCertificates, { AdminCertificateDetail } from "./AdminCertificates";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  issueDrafts: vi.fn(),
  deleteDraft: vi.fn(),
  getFile: vi.fn(),
  preview: vi.fn(),
  createObjectURL: vi.fn(() => "blob:admin-pdf"),
  revokeObjectURL: vi.fn(),
  open: vi.fn(),
}));
vi.mock("@/api/adminCertificatesApi", () => ({ adminCertificatesApi: { list: mocks.list, getById: mocks.getById, issueDrafts: mocks.issueDrafts, deleteDraft: mocks.deleteDraft } }));
vi.mock("@/api/certificateFilesApi", () => ({ certificateFilesApi: { getCertificateFile: mocks.getFile } }));
vi.mock("@/hooks/useProtectedCertificateFile", () => ({ useProtectedCertificateFile: mocks.preview }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const response = {
  success: true as const,
  length: 2,
  data: [
    { id: "draft-1", recipientName: "طالب المسودة", certificateType: "student_monthly", status: "draft", createdAt: "2026-09-01T00:00:00.000Z" },
    { id: "issued-1", recipientName: "طالب صادرة", certificateType: "student_monthly", status: "issued", issuedAt: "2026-09-02T00:00:00.000Z" },
  ],
  pagination: { current_page: 1, last_page: 2, per_page: 20, total: 21 },
};
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("AdminCertificates", () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.getById.mockReset();
    mocks.issueDrafts.mockReset();
    mocks.deleteDraft.mockReset();
    mocks.getFile.mockReset().mockResolvedValue(new Blob(["certificate"], { type: "application/pdf" }));
    mocks.preview.mockReset().mockImplementation((_id: string, _type: "pdf" | "preview", enabled = true) => ({ url: enabled ? "blob:admin-preview" : null, isLoading: false, error: null, retry: vi.fn() }));
    mocks.createObjectURL.mockClear();
    mocks.revokeObjectURL.mockClear();
    mocks.open.mockReset().mockReturnValue({ location: { href: "about:blank" }, closed: false, close: vi.fn() });
    vi.stubGlobal("URL", { createObjectURL: mocks.createObjectURL, revokeObjectURL: mocks.revokeObjectURL });
    vi.stubGlobal("open", mocks.open);
  });

  it("renders list, filters, pagination, and draft-only deletion", async () => {
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminCertificates /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("طالب المسودة")).toBeInTheDocument();
    expect(screen.getByText("طالب صادرة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حذف المسودة" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "التفاصيل" })).toHaveLength(2);
    expect(screen.getByText("صفحة 1 من 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 20 }));
  });

  it("renders detail data and loads preview through the protected file hook", async () => {
    mocks.getById.mockResolvedValue({ id: "issued-1", certificateNumber: "CERT-1", certificateType: "student_monthly", status: "issued", recipientSnapshot: { fullName: "طالب صادرة" }, previewImagePath: "https://example.com/preview.png", pdfPath: "https://example.com/certificate.pdf" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("CERT-1")).toBeInTheDocument();
    expect(screen.getByAltText("معاينة الشهادة")).toHaveAttribute("src", "blob:admin-preview");
    expect(screen.getByAltText("معاينة الشهادة")).not.toHaveAttribute("src", "https://example.com/preview.png");
    expect(mocks.preview).toHaveBeenCalledWith("issued-1", "preview", true);
    expect(screen.getByRole("button", { name: /فتح ملف الشهادة/ })).toBeInTheDocument();
  });

  it("shows preview loading and retry states", async () => {
    mocks.getById.mockResolvedValue({ id: "issued-1", certificateNumber: "CERT-1", status: "issued", previewImagePath: "preview.png" });
    mocks.preview.mockReturnValue({ url: null, isLoading: true, error: null, retry: vi.fn() });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("جاري تحميل المعاينة...")).toBeInTheDocument();

    const retry = vi.fn();
    mocks.preview.mockReturnValue({ url: null, isLoading: false, error: new Error("preview failed"), retry });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("تعذر تحميل المعاينة.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة تحميل المعاينة" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("opens the PDF through the protected Blob flow only after clicking", async () => {
    mocks.getById.mockResolvedValue({ id: "issued-1", certificateNumber: "CERT-1", status: "issued", pdfPath: "https://example.com/certificate.pdf" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByText("CERT-1");

    expect(mocks.getFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /فتح ملف الشهادة/ }));
    await waitFor(() => expect(mocks.getFile).toHaveBeenCalledWith("issued-1", "pdf"));
    expect(mocks.open).toHaveBeenCalledWith("about:blank", "_blank");
  });

  it("shows a PDF error and closes the temporary tab when loading fails", async () => {
    const close = vi.fn();
    mocks.open.mockReturnValue({ location: { href: "about:blank" }, closed: false, close });
    mocks.getFile.mockRejectedValue(new Error("pdf failed"));
    mocks.getById.mockResolvedValue({ id: "issued-1", certificateNumber: "CERT-1", status: "issued", pdfPath: "certificate.pdf" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByText("CERT-1");

    fireEvent.click(screen.getByRole("button", { name: /فتح ملف الشهادة/ }));
    expect(await screen.findByText("تعذر تحميل الشهادة. حاول مرة أخرى.")).toBeInTheDocument();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps unsupported destructive actions absent", async () => {
    mocks.list.mockResolvedValue({ ...response, data: [{ ...response.data[1], id: "issued-only" }] });
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminCertificates /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب صادرة")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حذف المسودة" })).not.toBeInTheDocument();
    expect(screen.queryByText(/استرداد|إلغاء الشهادة|تعديل الشهادة/)).not.toBeInTheDocument();
  });
});
