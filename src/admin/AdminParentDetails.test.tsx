import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminParentDetails from "./AdminParentDetails";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/adminParentsApi", () => ({ getAdminParent: mocks.get }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("AdminParentDetails", () => {
  it("renders parent and linked students without mutation controls", async () => {
    mocks.get.mockResolvedValue({ id: "parent-1", user: { fullName: "ولي الأمر", email: "parent@example.com", status: "active", isVerified: true }, phone: "010", whatsappNumber: "011", children: [{ id: "student-1", user: { fullName: "طالب" }, curriculum: { name: "منهج" }, grade: { name: "صف" }, registrationStatus: "approved" }] });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/parents/parent-1"]}><Routes><Route path="/admin/parents/:id" element={<AdminParentDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("تفاصيل ولي الأمر")).toBeInTheDocument();
    expect(screen.getAllByText("طالب")).toHaveLength(2);
    expect(screen.getByText("منهج")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /حذف|تعديل|تعطيل|تفعيل/ })).not.toBeInTheDocument();
  });
});
