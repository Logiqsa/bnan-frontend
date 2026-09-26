import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  subject: { name: "رياضيات" }, classroom: { name: "فصل 1", curriculum: { id: "curriculum-1", name: "المنهج" } }, currentTeacher: { user: { fullName: "المعلم الحالي" } },
});

const renderPage = async (item = request("change_teacher"), teacherOptions = [{ id: "user-replacement-1", teacherId: "replacement-1", fullName: "المعلم البديل", teacherStatus: "approved" as const, curriculums: [{ id: "curriculum-1" }] }], openDetail = true) => {
  mocks.list.mockResolvedValue({ success: true, data: [item], total: 1 });
  mocks.get.mockResolvedValue({ success: true, data: item });
  mocks.listAllWithTeacherProfiles.mockResolvedValue(teacherOptions);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ClassroomChangeRequestsAdmin /></MemoryRouter></QueryClientProvider>);
  await screen.findByText("قائمة الطلبات");
  if (openDetail) {
    fireEvent.click(screen.getByRole("button", { name: "التفاصيل" }));
    await screen.findAllByText("المعلم الحالي");
  }
};

describe("ClassroomChangeRequestsAdmin", () => {
  const requestTableRow = () => within(screen.getAllByRole("row")[1]);

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

  it("shows only approved teachers linked to the request curriculum", async () => {
    await renderPage(request("change_teacher"), [
      { id: "user-matched", teacherId: "teacher-matched", fullName: "معلم مرتبط", teacherStatus: "approved", curriculums: [{ id: "curriculum-1" }] },
      { id: "user-other-curriculum", teacherId: "teacher-other", fullName: "معلم منهج آخر", teacherStatus: "approved", curriculums: [{ id: "curriculum-2" }] },
      { id: "user-pending", teacherId: "teacher-pending", fullName: "معلم غير معتمد", teacherStatus: "pending", curriculums: [{ id: "curriculum-1" }] },
    ]);

    fireEvent.click(screen.getByRole("combobox", { name: "المعلم البديل" }));
    expect(await screen.findByText("معلم مرتبط")).toBeInTheDocument();
    expect(screen.queryByText("معلم منهج آخر")).not.toBeInTheDocument();
    expect(screen.queryByText("معلم غير معتمد")).not.toBeInTheDocument();
  });

  it("does not show all teachers when the request curriculum is missing", async () => {
    await renderPage({ ...request("change_teacher"), classroom: { name: "فصل 1" } });

    fireEvent.click(screen.getByRole("combobox", { name: "المعلم البديل" }));
    expect(await screen.findByText("لا تتوفر بيانات المنهج لفلترة المعلمين.")).toBeInTheDocument();
  });

  it("shows replacementTeacher for approved requests in the table", async () => {
    await renderPage({ ...request("change_teacher"), status: "approved", replacementTeacher: { user: { fullName: "المعلم البديل" } } }, undefined, false);
    expect(requestTableRow().getByText("المعلم البديل")).toBeInTheDocument();
    expect(requestTableRow().queryByText("المعلم الحالي")).not.toBeInTheDocument();
  });

  it.each(["pending", "rejected"] as const)("shows currentTeacher for %s requests in the table", async (status) => {
    await renderPage({ ...request("change_teacher"), status, replacementTeacher: { user: { fullName: "المعلم البديل" } } }, undefined, false);
    expect(requestTableRow().getByText("المعلم الحالي")).toBeInTheDocument();
    expect(requestTableRow().queryByText("المعلم البديل")).not.toBeInTheDocument();
  });

  it("shows currentTeacher when an approved request has no replacementTeacher", async () => {
    await renderPage({ ...request("change_teacher"), status: "approved" }, undefined, false);
    expect(requestTableRow().getByText("المعلم الحالي")).toBeInTheDocument();
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
