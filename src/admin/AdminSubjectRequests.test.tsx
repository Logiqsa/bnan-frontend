import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminSubjectRequests from "./AdminSubjectRequests";

const mocks = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock("@/api/adminSubjectRequestsApi", () => ({ adminSubjectRequestsApi: { list: mocks.list, approve: mocks.approve, reject: mocks.reject } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const response = {
  success: true as const,
  results: 1,
  total: 1,
  page: 1,
  limit: 20,
  data: [{ id: "request-1", status: "awaiting_admin_approval", student: { user: { fullName: "طالب مصري" } }, curriculum: { name: "المنهج المصري" }, grade: { name: "الصف الأول" }, subject: { name: "الرياضيات" }, package: { name: "باقة" }, createdAt: "2026-01-01T00:00:00.000Z" }],
};
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("Admin Egyptian subject requests", () => {
  it("loads the Egyptian-only queue and exposes approval controls", async () => {
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminSubjectRequests /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب مصري")).toBeInTheDocument();
    expect(screen.getByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اعتماد" })).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("requires a receipt before approval and sends the receipt form", async () => {
    mocks.list.mockResolvedValue(response);
    mocks.approve.mockResolvedValue({ success: true, data: response.data[0] });
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminSubjectRequests /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "اعتماد" }));
    expect(screen.getByRole("button", { name: "تأكيد الاعتماد" })).toBeDisabled();
    const file = new File(["image"], "receipt.png", { type: "image/png" });
    fireEvent.change(document.querySelector("#subject-receipt")!, { target: { files: [file] } });
    expect(screen.getByRole("button", { name: "تأكيد الاعتماد" })).not.toBeDisabled();
  });

  it("rejects through the dedicated reject action without a reason field", async () => {
    mocks.list.mockResolvedValue(response);
    mocks.reject.mockResolvedValue({ success: true, data: response.data[0] });
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminSubjectRequests /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "رفض" }));
    expect(screen.getByText(/لا يدعم هذا endpoint إرسال سبب رفض/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الرفض" }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith("request-1"));
  });
});
