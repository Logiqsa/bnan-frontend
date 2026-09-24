import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminCertificates, { AdminCertificateDetail } from "./AdminCertificates";

const mocks = vi.hoisted(() => ({ list: vi.fn(), getById: vi.fn(), issueDrafts: vi.fn(), deleteDraft: vi.fn() }));
vi.mock("@/api/adminCertificatesApi", () => ({ adminCertificatesApi: { list: mocks.list, getById: mocks.getById, issueDrafts: mocks.issueDrafts, deleteDraft: mocks.deleteDraft } }));
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

  it("renders detail data and preview/pdf links", async () => {
    mocks.getById.mockResolvedValue({ id: "issued-1", certificateNumber: "CERT-1", certificateType: "student_monthly", status: "issued", recipientSnapshot: { fullName: "طالب صادرة" }, previewImagePath: "https://example.com/preview.png", pdfPath: "https://example.com/certificate.pdf" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/certificates/issued-1"]}><Routes><Route path="/admin/certificates/:certificateId" element={<AdminCertificateDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("CERT-1")).toBeInTheDocument();
    expect(screen.getByAltText("معاينة الشهادة")).toHaveAttribute("src", "https://example.com/preview.png");
    expect(screen.getByRole("link", { name: /فتح ملف الشهادة/ })).toHaveAttribute("href", "https://example.com/certificate.pdf");
  });

  it("keeps unsupported destructive actions absent", async () => {
    mocks.list.mockResolvedValue({ ...response, data: [{ ...response.data[1], id: "issued-only" }] });
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminCertificates /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب صادرة")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حذف المسودة" })).not.toBeInTheDocument();
    expect(screen.queryByText(/استرداد|إلغاء الشهادة|تعديل الشهادة/)).not.toBeInTheDocument();
  });
});
