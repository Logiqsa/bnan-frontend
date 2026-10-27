import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminStudentDetails from "./AdminStudentDetails";

const mocks = vi.hoisted(() => ({ get: vi.fn(), registrations: vi.fn(), findRegistration: vi.fn(), confirmPayment: vi.fn(), approve: vi.fn() }));
vi.mock("@/api/adminStudentsApi", () => ({ getAdminStudent: mocks.get, getAdminStudentRegistrations: mocks.registrations }));
vi.mock("@/api/egyptianRegistrationRequestsApi", () => ({ egyptianRegistrationRequestsApi: { findByUser: mocks.findRegistration, confirmPayment: mocks.confirmPayment, approve: mocks.approve } }));
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

  it("opens a read-only course and classroom registration summary", async () => {
    mocks.get.mockResolvedValue({ id: "student-1", user: { fullName: "طالب" } });
    mocks.registrations.mockResolvedValue({ courses: [{ id: "course-enrollment", course: { name: "دورة العلوم" }, group: { name: "المجموعة أ" }, classroom: { name: "فصل العلوم" }, mode: "group", status: "active" }], classrooms: [{ id: "classroom-enrollment", classroom: { name: "فصل رياضيات", sourceType: "legacy" }, status: "approved" }] });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/students/student-1"]}><Routes><Route path="/admin/students/:id" element={<AdminStudentDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "تفاصيل التسجيل" }));
    expect(await screen.findByText("دورة العلوم")).toBeInTheDocument();
    expect(screen.getByText("فصل رياضيات")).toBeInTheDocument();
    expect(mocks.registrations).toHaveBeenCalledWith("student-1");
  });

  it("approves payment from the student page with required amount and receipt", async () => {
    mocks.get.mockResolvedValue({ id: "student-1", user: { id: "user-1", fullName: "طالب", email: "student@example.com" }, registrationStatus: "pending" });
    mocks.findRegistration.mockResolvedValue({ studentId: "student-1", registrationStatus: "pending", payment: { status: "pending", currency: "EGP" } });
    mocks.confirmPayment.mockResolvedValue({ success: true, data: { payment: { status: "confirmed", amount: 750 } } });
    mocks.approve.mockResolvedValue({ success: true, data: { student: { studentId: "student-1", registrationStatus: "approved" } } });
    render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={["/admin/students/student-1"]}><Routes><Route path="/admin/students/:id" element={<AdminStudentDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.change(await screen.findByLabelText("المبلغ المدفوع *"), { target: { value: "750" } });
    const receipt = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("اختيار صورة إيصال التحويل"), { target: { files: [receipt] } });
    fireEvent.click(screen.getByRole("button", { name: "اعتماد الدفع وتفعيل الطالب" }));
    await waitFor(() => expect(mocks.confirmPayment).toHaveBeenCalledWith("student-1", { receipt, amount: 750 }));
    expect(mocks.approve).toHaveBeenCalledWith("student-1");
  });
});
