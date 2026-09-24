import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNotificationHistory from "@/admin/AdminNotificationHistory";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/adminNotificationHistoryApi", () => ({ adminNotificationHistoryApi: { list: mocks.list } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const response = {
  success: true,
  results: 1,
  data: [{
    broadcastId: "broadcast-1",
    title: "تحديث المنصة",
    content: "محتوى الإشعار",
    image: null,
    audience: "student",
    status: "completed",
    usersTargeted: 10,
    notificationsCreated: 9,
    tokensTargeted: 8,
    pushSuccessCount: 7,
    pushFailureCount: 1,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:05:00.000Z",
  }],
  pagination: { current_page: 1, last_page: 2, per_page: 20, total: 21 },
};

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderPage = () => render(<QueryClientProvider client={client()}><MemoryRouter><AdminNotificationHistory /></MemoryRouter></QueryClientProvider>);

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue(response);
});

describe("AdminNotificationHistory", () => {
  it("renders history rows, labels, and all backend counters", async () => {
    renderPage();
    expect(await screen.findByText("تحديث المنصة")).toBeInTheDocument();
    expect(screen.getByText("الطلاب")).toBeInTheDocument();
    expect(screen.getByText("مكتمل")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("shows loading, error/retry, and empty states", async () => {
    let resolve: (value: typeof response) => void = () => undefined;
    mocks.list.mockReturnValueOnce(new Promise((res) => { resolve = res; }));
    renderPage();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    resolve({ ...response, data: [], results: 0, pagination: { ...response.pagination, total: 0, last_page: 0 } });
    expect(await screen.findByText("لا توجد إشعارات مرسلة.")).toBeInTheDocument();

    cleanup();
  });

  it("shows an error and retries the current query", async () => {
    mocks.list.mockImplementation(() => Promise.reject(new Error("network")));
    renderPage();
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 20 }));
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toBeInTheDocument();
    mocks.list.mockImplementation(() => Promise.resolve(response));
    fireEvent.click(screen.getByText("إعادة المحاولة"));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 20 }));
  });

  it("uses backend pagination and resets page when a filter changes", async () => {
    renderPage();
    await screen.findByText("تحديث المنصة");
    fireEvent.click(screen.getByLabelText("الصفحة التالية"));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 2, limit: 20 }));
    fireEvent.click(screen.getByRole("combobox", { name: "الجمهور" }));
    fireEvent.click(await screen.findByText("المعلمين"));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 20, audience: "teacher" }));
  });

  it("does not crash on unknown backend labels", async () => {
    mocks.list.mockResolvedValueOnce({ ...response, data: [{ ...response.data[0], audience: "unknown-audience", status: "unknown-status" }] });
    renderPage();
    expect(await screen.findByText("unknown-audience")).toBeInTheDocument();
    expect(screen.getByText("unknown-status")).toBeInTheDocument();
  });
});
