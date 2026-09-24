import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminStudents from "./AdminStudents";

const mocks = vi.hoisted(() => ({ list: vi.fn(), parents: vi.fn(), curriculums: vi.fn(), grades: vi.fn(), allGrades: vi.fn() }));
vi.mock("@/api/adminStudentsApi", () => ({ listAdminStudents: mocks.list }));
vi.mock("@/api/adminParentsApi", () => ({ listAdminParents: mocks.parents }));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: mocks.curriculums, grades: mocks.grades, allGrades: mocks.allGrades } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
const response = { success: true, results: 1, data: [{ id: "student-1", user: { fullName: "طالب", email: "student@example.com", status: "active" }, registrationType: "academic", registrationStatus: "approved", createdAt: "2026-01-01T00:00:00.000Z" }], pagination: { current_page: 1, last_page: 2, per_page: 20, total: 21 } };
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const configureOptions = () => {
  mocks.parents.mockResolvedValue({ data: [{ id: "parent-1", user: { fullName: "ولي الأمر" } }] });
  mocks.curriculums.mockResolvedValue({ data: [{ id: "curriculum-1", name: "المنهج المصري", registrationMode: "egyptian" }] });
  mocks.allGrades.mockResolvedValue({ data: [{ id: "grade-1", name: "الصف الأول" }] });
  mocks.grades.mockResolvedValue({ data: [{ id: "grade-1", name: "الصف الأول" }] });
};

describe("AdminStudents", () => {
  it("renders data, server filters and pagination without mutation controls", async () => {
    mocks.list.mockResolvedValue(response);
    configureOptions();
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminStudents /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب")).toBeInTheDocument();
    expect(screen.getByText("طالب أكاديمي")).toBeInTheDocument();
    expect(screen.getByText("صفحة 1 من 2 — 21 نتيجة")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("بحث"), { target: { value: "Ali" } });
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ search: "Ali", page: 1, limit: 20 }));
    expect(screen.queryByRole("button", { name: /حذف|تعديل|تعطيل|تفعيل/ })).not.toBeInTheDocument();
  });
  it("renders the empty state and retries errors", async () => {
    mocks.list.mockRejectedValue(new Error("network"));
    configureOptions();
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminStudents /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toBeInTheDocument();
    mocks.list.mockResolvedValue({ ...response, data: [], pagination: { ...response.pagination, total: 0, last_page: 0 } });
    fireEvent.click(screen.getByText("إعادة المحاولة"));
    expect(await screen.findByText("لا يوجد طلاب.")).toBeInTheDocument();
  });
});
