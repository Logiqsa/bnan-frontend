import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminStudentDetails from "./AdminStudentDetails";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/adminStudentsApi", () => ({ getAdminStudent: mocks.get }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("AdminStudentDetails", () => {
  it("renders safe returned fields and no mutation controls", async () => {
    mocks.get.mockResolvedValue({ id: "student-1", user: { fullName: "طالب", email: "student@example.com", status: "active", isVerified: true }, registrationType: "academic", registrationStatus: "approved", curriculum: { name: "منهج" }, subjects: [{ name: "رياضيات" }], parent: { phone: "010", user: { fullName: "ولي الأمر" } } });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/students/student-1"]}><Routes><Route path="/admin/students/:id" element={<AdminStudentDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("تفاصيل الطالب")).toBeInTheDocument();
    expect(screen.getByText("طالب")).toBeInTheDocument();
    expect(screen.getByText("رياضيات")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /حذف|تعديل|تعطيل|تفعيل/ })).not.toBeInTheDocument();
  });
});
