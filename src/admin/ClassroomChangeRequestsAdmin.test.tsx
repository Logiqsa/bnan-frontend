import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ClassroomChangeRequestsAdmin from "./ClassroomChangeRequestsAdmin";

Element.prototype.scrollIntoView = vi.fn();
Object.assign(globalThis, { ResizeObserver: class { observe() {} unobserve() {} disconnect() {} } });

const mocks = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), approve: vi.fn(), reject: vi.fn(), listAllWithTeacherProfiles: vi.fn(),
}));

vi.mock("@/api/adminClassroomChangeRequestsApi", () => ({
  adminClassroomChangeRequestsApi: { list: mocks.list, get: mocks.get, approve: mocks.approve, reject: mocks.reject },
}));
vi.mock("@/api/adminUsersApi", () => ({ adminUsersApi: { listAllWithTeacherProfiles: mocks.listAllWithTeacherProfiles } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const request = (requestType: "change_teacher" | "teacher_leave" | "cancel_subject") => ({
  id: `${requestType}-1`, requestType, status: "pending", notes: "سبب واضح", student: { user: { fullName: "طالب" } },
  subject: { name: "رياضيات" }, classroom: { name: "فصل 1" }, currentTeacher: { user: { fullName: "المعلم الحالي" } },
});

const renderPage = async (item = request("change_teacher")) => {
  mocks.list.mockResolvedValue({ success: true, data: [item], total: 1 });
  mocks.get.mockResolvedValue({ success: true, data: item });
  mocks.listAllWithTeacherProfiles.mockResolvedValue([{ id: "user-replacement-1", teacherId: "replacement-1", fullName: "المعلم البديل", teacherStatus: "approved" }]);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ClassroomChangeRequestsAdmin /></MemoryRouter></QueryClientProvider>);
  await screen.findByText("قائمة الطلبات");
  fireEvent.click(screen.getByRole("button", { name: "التفاصيل" }));
  await screen.findAllByText("المعلم الحالي");
};

describe("ClassroomChangeRequestsAdmin", () => {
  it("renders the request list and replacement selector for change_teacher", async () => {
    await renderPage();
    expect(screen.getAllByText("المعلم البديل").length).toBeGreaterThan(0);
    expect(screen.getByText("اختر المعلم البديل")).toBeInTheDocument();
  });

  it("requires a replacement teacher before approving", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /موافقة/ })).toBeDisabled();
  });

  it("does not show replacement selection for cancel_subject", async () => {
    await renderPage(request("cancel_subject"));
    expect(screen.queryByText("اختر المعلم البديل")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /موافقة/ })).not.toBeDisabled();
  });

  it("sends the selected replacement teacher and prevents duplicate approval", async () => {
    mocks.approve.mockResolvedValue({ success: true, data: { ...request("change_teacher"), status: "approved" } });
    await renderPage();
    fireEvent.click(screen.getAllByRole("combobox").at(-1)!);
    fireEvent.click(screen.getAllByText("المعلم البديل").at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: /موافقة/ }));
    fireEvent.click(await screen.findByRole("button", { name: "تأكيد الموافقة" }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledTimes(1));
    expect(mocks.approve).toHaveBeenCalledWith("change_teacher-1", { replacementTeacherId: "replacement-1" });
  });

  it("rejects through the existing endpoint", async () => {
    mocks.reject.mockResolvedValue({ success: true, data: { ...request("teacher_leave"), status: "rejected" } });
    await renderPage(request("teacher_leave"));
    fireEvent.click(screen.getByRole("button", { name: "رفض" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الرفض" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الرفض" }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalled());
    expect(mocks.reject).toHaveBeenCalledWith("teacher_leave-1", {});
  });
});
