import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentMessages from "./StudentMessages";

const mocks = vi.hoisted(() => ({
  rooms: vi.fn(),
  listeners: new Map<string, (...args: unknown[]) => void>(),
  emit: vi.fn(),
}));

vi.mock("@/api/chatApi", async () => {
  const actual = await vi.importActual<typeof import("@/api/chatApi")>("@/api/chatApi");
  return { ...actual, chatApi: { ...actual.chatApi, rooms: mocks.rooms } };
});
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { id: "student-1", role: "student" } }) }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ar", pick: (ar: string) => ar }) }));
vi.mock("@/components/chat/TeacherChatConversation", () => ({
  default: ({ room }: { room: { id: string; displayName?: string } }) => <div>CONVERSATION:{room.id}:{room.displayName}</div>,
}));
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    connected: true,
    emit: mocks.emit,
    on: (event: string, listener: (...args: unknown[]) => void) => mocks.listeners.set(event, listener),
    off: (event: string) => mocks.listeners.delete(event),
  }),
}));

const rooms = [
  { id: "room-1", displayName: "فصل الرياضيات", subtitle: "الصف الأول", lastMessage: "أهلًا", lastMessageAt: "2026-09-23T10:00:00.000Z", unreadCount: 2 },
  { id: "room-2", displayName: "الدعم", subtitle: "مساعدة", unreadCount: 0 },
];

const renderPage = (url = "/portal/student/messages") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}><StudentMessages /></MemoryRouter>
      </QueryClientProvider>,
    ),
  };
};

describe("StudentMessages", () => {
  beforeEach(() => {
    mocks.rooms.mockReset();
    mocks.listeners.clear();
    mocks.emit.mockReset();
  });

  it("renders loading, rooms, previews, unread count and local search", async () => {
    let resolveRooms!: (value: typeof rooms) => void;
    mocks.rooms.mockReturnValue(new Promise((resolve) => { resolveRooms = resolve; }));
    renderPage();
    expect(screen.getByLabelText("جاري تحميل المحادثات")).toBeInTheDocument();
    resolveRooms(rooms);
    expect(await screen.findByText("فصل الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("أهلًا")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("ابحث عن محادثة..."), { target: { value: "الدعم" } });
    expect(screen.getByText("الدعم")).toBeInTheDocument();
    expect(screen.queryByText("فصل الرياضيات")).not.toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mocks.rooms.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("لا توجد محادثات متاحة حتى الآن.")).toBeInTheDocument();
  });

  it("shows an error and retries", async () => {
    mocks.rooms
      .mockRejectedValueOnce(new Error("failed"))
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(rooms);
    renderPage();
    expect(await screen.findByText("تعذر تحميل المحادثات.", {}, { timeout: 4_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("فصل الرياضيات")).toBeInTheDocument();
    expect(mocks.rooms).toHaveBeenCalledTimes(3);
  });

  it("selects only a URL room that exists", async () => {
    mocks.rooms.mockResolvedValue(rooms);
    renderPage("/portal/student/messages?roomId=room-2");
    expect(await screen.findByText("CONVERSATION:room-2:الدعم")).toBeInTheDocument();
  });

  it("does not open an arbitrary missing room", async () => {
    mocks.rooms.mockResolvedValue(rooms);
    renderPage("/portal/student/messages?roomId=missing-room");
    expect(await screen.findByText("المحادثة المطلوبة غير متاحة.")).toBeInTheDocument();
    expect(screen.queryByText(/CONVERSATION:/)).not.toBeInTheDocument();
  });

  it("marks a selected room read and increments another room from realtime", async () => {
    mocks.rooms.mockResolvedValue(rooms);
    const { client } = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /فصل الرياضيات/ }));
    expect(await screen.findByText("CONVERSATION:room-1:فصل الرياضيات")).toBeInTheDocument();
    await waitFor(() => expect(mocks.listeners.has("newMessage")).toBe(true));
    mocks.listeners.get("newMessage")?.({
      id: "message-1",
      room: "room-2",
      text: "رسالة جديدة",
      sender: { id: "other-user" },
      createdAt: "2026-09-23T11:00:00.000Z",
    });
    await waitFor(() => {
      const cached = client.getQueryData<typeof rooms>(["student-chat-rooms"]);
      expect(cached?.find((room) => room.id === "room-2")?.unreadCount).toBe(1);
      expect(cached?.find((room) => room.id === "room-2")?.lastMessage).toBe("رسالة جديدة");
    });
  });
});
