import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminGulfSubjectRequests, { AdminGulfSubjectRequestDetail } from "./AdminGulfSubjectRequests";

const mocks = vi.hoisted(() => ({ list: vi.fn(), getById: vi.fn() }));
vi.mock("@/api/adminGulfSubjectRequestsApi", () => ({ adminGulfSubjectRequestsApi: { list: mocks.list, getById: mocks.getById } }));
const optionMocks = vi.hoisted(() => ({ listStudents: vi.fn(), curriculums: vi.fn(), subjectsByCurriculum: vi.fn(), packages: vi.fn() }));
vi.mock("@/api/adminStudentsApi", () => ({ listAdminStudents: optionMocks.listStudents }));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: optionMocks.curriculums, subjectsByCurriculum: optionMocks.subjectsByCurriculum, packages: optionMocks.packages } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
Element.prototype.scrollIntoView = vi.fn();

const response = { success: true, results: 1, data: [{ id: "request-1", status: "assigned", student: { user: { fullName: "طالب خليجي" } }, subject: { name: "الرياضيات" }, package: { name: "باقة" }, payment: { paymentStatus: "paid", provider: "tamara", amount: 250, currency: "SAR" }, requestedAt: "2026-01-01T00:00:00.000Z" }], pagination: { current_page: 1, last_page: 2, per_page: 20, total: 21 } };
const configureOptions = () => {
  optionMocks.listStudents.mockResolvedValue({ success: true, data: [{ id: "student-1", user: { fullName: "طالب خليجي" } }] });
  optionMocks.curriculums.mockResolvedValue({ success: true, data: [{ id: "curriculum-1", name: "منهج خليجي", registrationMode: "gulf" }, { id: "curriculum-egypt", name: "منهج مصري", registrationMode: "egyptian" }] });
  optionMocks.subjectsByCurriculum.mockResolvedValue({ success: true, data: [{ id: "subject-1", name: "الرياضيات" }] });
  optionMocks.packages.mockResolvedValue({ success: true, data: [{ id: "package-1", name: "باقة" }] });
};
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("Admin Gulf subject requests screens", () => {
  it("renders server-filtered list and pagination without mutation controls", async () => {
    configureOptions();
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminGulfSubjectRequests /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("طالب خليجي")).toBeInTheDocument();
    expect(screen.getByText("صفحة 1 من 2")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "حالة الدفع" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "بوابة الدفع" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "الطالب" })).toBeInTheDocument();
    expect(screen.queryByText("student-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "الطالب" }));
    fireEvent.click(await screen.findByRole("option", { name: "طالب خليجي" }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ student: "student-1", page: 1, limit: 20 })));
    expect(screen.queryByRole("button", { name: /موافقة|رفض|إلغاء|تعيين/ })).not.toBeInTheDocument();
  });

  it("renders read-only request details", async () => {
    mocks.getById.mockResolvedValue({ ...response.data[0], notes: "ملاحظة" });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/gulf-subject-requests/request-1"]}><Routes><Route path="/admin/gulf-subject-requests/:id" element={<AdminGulfSubjectRequestDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("تفاصيل طلب المادة الخليجية")).toBeInTheDocument();
    expect(screen.getByText("request-1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /موافقة|رفض|إلغاء|تعيين/ })).not.toBeInTheDocument();
  });

  it("sends raw categorical values and removes them when cleared", async () => {
    configureOptions();
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminGulfSubjectRequests /></MemoryRouter></QueryClientProvider>);
    await screen.findByText("طالب خليجي");
    fireEvent.click(screen.getByRole("combobox", { name: "حالة الدفع" }));
    fireEvent.click(await screen.findByRole("option", { name: "مدفوع" }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ paymentStatus: "paid" })));
    fireEvent.click(screen.getByRole("combobox", { name: "بوابة الدفع" }));
    fireEvent.click(await screen.findByRole("option", { name: "تمارا" }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ provider: "tamara" })));
    fireEvent.click(screen.getByRole("combobox", { name: "بوابة الدفع" }));
    fireEvent.click(await screen.findByRole("option", { name: "كل البوابات" }));
    await waitFor(() => {
      const last = mocks.list.mock.calls.at(-1)?.[0];
      expect(last.provider).toBeUndefined();
      expect(last.paymentStatus).toBe("paid");
    });
  });

  it("uses dependent curriculum options and resets subject/package selections", async () => {
    configureOptions();
    mocks.list.mockResolvedValue(response);
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminGulfSubjectRequests /></MemoryRouter></QueryClientProvider>);
    await screen.findByText("طالب خليجي");
    fireEvent.click(screen.getByRole("combobox", { name: "المنهج" }));
    fireEvent.click(await screen.findByRole("option", { name: "منهج خليجي" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "المادة" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("combobox", { name: "المادة" }));
    fireEvent.click(await screen.findByRole("option", { name: "الرياضيات" }));
    fireEvent.click(screen.getByRole("combobox", { name: "الباقة" }));
    fireEvent.click(await screen.findByRole("option", { name: "باقة" }));
    fireEvent.click(screen.getByRole("combobox", { name: "المنهج" }));
    fireEvent.click(await screen.findByRole("option", { name: "كل المناهج" }));
    expect(screen.getByRole("combobox", { name: "المادة" })).toHaveTextContent("كل المواد");
    expect(screen.getByRole("combobox", { name: "الباقة" })).toHaveTextContent("كل الباقات");
    await waitFor(() => {
      const last = mocks.list.mock.calls.at(-1)?.[0];
      expect(last.subject).toBeUndefined();
      expect(last.package).toBeUndefined();
    });
  });
});
