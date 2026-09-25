import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const mocks = vi.hoisted(() => ({
  statistics: vi.fn(),
  teacherApplications: vi.fn(),
  egyptianRequests: vi.fn(),
  gulfRequests: vi.fn(),
  classroomChanges: vi.fn(),
}));

vi.mock("@/api/adminDashboardApi", () => ({ adminDashboardApi: { statistics: mocks.statistics } }));
vi.mock("@/api/teacherApplicationsApi", () => ({ teacherApplicationsApi: { countByStatus: mocks.teacherApplications } }));
vi.mock("@/api/adminSubjectRequestsApi", () => ({ adminSubjectRequestsApi: { list: mocks.egyptianRequests } }));
vi.mock("@/api/adminGulfSubjectRequestsApi", () => ({ adminGulfSubjectRequestsApi: { list: mocks.gulfRequests } }));
vi.mock("@/api/adminClassroomChangeRequestsApi", () => ({ adminClassroomChangeRequestsApi: { list: mocks.classroomChanges } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ isArabic: true, pick: (ar: string) => ar }) }));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const configure = () => {
  mocks.statistics.mockResolvedValue({ totalStudents: 120, totalTeachers: 18, activeSubscriptions: 76, expiredSubscriptions: 4, pendingReceipts: 3, todaySessions: 11 });
  mocks.teacherApplications.mockResolvedValue(5);
  mocks.egyptianRequests.mockResolvedValue({ data: [], total: 2 });
  mocks.gulfRequests.mockResolvedValue({ data: [], pagination: { total: 7 } });
  mocks.classroomChanges.mockResolvedValue({ data: [], total: 1 });
};

describe("Admin dashboard overview", () => {
  it("renders actual KPI and pending action data with safe navigation links", async () => {
    configure();
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminDashboard /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("لوحة التحكم")).toBeInTheDocument();
    expect(screen.getByText("١٢٠")).toBeInTheDocument();
    expect(screen.getByText("١٨")).toBeInTheDocument();
    expect(screen.getByText("طلبات المواد المصرية")).toBeInTheDocument();
    expect(screen.getByText("٧")).toBeInTheDocument();
    expect(screen.queryByText("أولياء الأمور")).not.toBeInTheDocument();
  });

  it("keeps the overview usable when one independent action widget fails", async () => {
    configure();
    mocks.gulfRequests.mockRejectedValue(new Error("network"));
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminDashboard /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("الوضع المالي ")).toBeInTheDocument();
    expect(await screen.findByText("تعذر تحميل هذه البيانات.")).toBeInTheDocument();
    expect(screen.getAllByText("طلبات المعلمين").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons before statistics are available", () => {
    configure();
    mocks.statistics.mockReturnValue(new Promise(() => undefined));
    render(<QueryClientProvider client={client()}><MemoryRouter><AdminDashboard /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByLabelText("تحديث لوحة التحكم")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
