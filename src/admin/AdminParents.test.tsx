import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminParents from "./AdminParents";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/adminParentsApi", () => ({ listAdminParents: mocks.list }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
const response = { success: true, results: 1, data: [{ id: "parent-1", user: { fullName: "ولي الأمر", email: "parent@example.com", status: "active" }, phone: "010", whatsappNumber: "011", children: [{ id: "student-1" }] }], pagination: { current_page: 1, last_page: 2, per_page: 20, total: 21 } };
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("AdminParents", () => {
  it("renders data, server filters and pagination without mutation controls", async () => {
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminParents /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("parent@example.com")).toBeInTheDocument();
    expect(screen.getByText("صفحة 1 من 2 — 21 نتيجة")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("الهاتف"), { target: { value: "010" } });
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ phone: "010", page: 1, limit: 20 }));
    expect(screen.queryByRole("button", { name: /حذف|تعديل|تعطيل|تفعيل/ })).not.toBeInTheDocument();
  });
  it("renders empty state after an error retry", async () => {
    mocks.list.mockRejectedValue(new Error("network"));
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminParents /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toBeInTheDocument();
    mocks.list.mockResolvedValue({ ...response, data: [], pagination: { ...response.pagination, total: 0, last_page: 0 } });
    fireEvent.click(screen.getByText("إعادة المحاولة"));
    expect(await screen.findByText("لا يوجد أولياء أمور.")).toBeInTheDocument();
  });
});
