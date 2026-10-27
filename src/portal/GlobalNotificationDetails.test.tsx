import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import GlobalNotificationDetails from "./GlobalNotificationDetails";

const mocks = vi.hoisted(() => ({ getGlobal: vi.fn() }));
vi.mock("@/api/notificationsApi", () => ({ notificationsApi: { getGlobal: mocks.getGlobal } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("GlobalNotificationDetails", () => {
  it("loads and renders the complete global notification", async () => {
    mocks.getGlobal.mockResolvedValue({ success: true, data: {
      id: "notification-1", type: "announcement", key: "GLOBAL_NOTIFICATION",
      title: "إعلان مهم", body: "كل تفاصيل الإعلان", image: "https://example.com/image.jpg",
      isRead: false, status: "unread", createdAt: "2026-10-27T12:00:00.000Z",
    } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={["/portal/student/notifications/broadcast-1"]}><Routes><Route path="/portal/student/notifications/:broadcastId" element={<GlobalNotificationDetails role="student" />} /></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "إعلان مهم" })).toBeInTheDocument();
    expect(screen.getByText("كل تفاصيل الإعلان")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "إعلان مهم" })).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(mocks.getGlobal).toHaveBeenCalledWith("broadcast-1");
  });
});
