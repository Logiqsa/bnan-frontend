import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAssignments from "@/admin/AdminAssignments";

const mocks = vi.hoisted(() => ({
  listAssignments: vi.fn(),
  listAll: vi.fn(),
  curriculums: vi.fn(),
  grades: vi.fn(),
  subjectsByCurriculum: vi.fn(),
  listAllClassrooms: vi.fn(),
}));

vi.mock("@/api/adminAssignmentsApi", () => ({ adminAssignmentsApi: { listAssignments: mocks.listAssignments } }));
vi.mock("@/api/adminUsersApi", () => ({ adminUsersApi: { listAll: mocks.listAll } }));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: mocks.curriculums, grades: mocks.grades, subjectsByCurriculum: mocks.subjectsByCurriculum } }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: { listAllClassrooms: mocks.listAllClassrooms } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderPage = () => render(<QueryClientProvider client={client()}><MemoryRouter><AdminAssignments /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAssignments.mockResolvedValue({ success: true, results: 1, data: [{ id: "a1", title: "واجب الرياضيات", status: "active", totalPoints: 10, subject: { name: "رياضيات" }, teacher: { user: { fullName: "معلم الرياضيات" } } }], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 } });
  mocks.listAll.mockResolvedValue([{ id: "t1", fullName: "معلم الرياضيات", role: "teacher" }]);
  mocks.curriculums.mockResolvedValue({ data: [{ id: "c1", name: "المنهج المصري", registrationMode: "egyptian" }] });
  mocks.grades.mockResolvedValue({ data: [{ id: "g1", name: "الصف الأول" }] });
  mocks.subjectsByCurriculum.mockResolvedValue({ data: [{ id: "s1", name: "رياضيات" }] });
  mocks.listAllClassrooms.mockResolvedValue({ data: [{ id: "cl1", name: "فصل 1" }] });
});

describe("AdminAssignments", () => {
  it("renders the read-only assignment list and human-readable filters", async () => {
    renderPage();
    expect(await screen.findByText("واجب الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("اختر المعلم")).toBeInTheDocument();
    expect(screen.getByText("اختر المنهج")).toBeInTheDocument();
    expect(screen.getAllByText("الحالة").length).toBeGreaterThan(0);
    expect(mocks.listAssignments).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("loads dependent grade and subject options only after a curriculum is selected", async () => {
    renderPage();
    await screen.findByText("واجب الرياضيات");
    expect(mocks.grades).not.toHaveBeenCalled();
    expect(mocks.subjectsByCurriculum).not.toHaveBeenCalled();
    expect(screen.getAllByText("اختر المنهج أولًا").length).toBe(2);
  });
});
