import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminClassroomChat from "./AdminClassroomChat";
import { LanguageProvider } from "@/i18n/LanguageContext";

const mocks = vi.hoisted(() => ({
  adminRooms: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  handlers: new Map<string, (...args: unknown[]) => void>(),
}));

vi.mock("@/api/chatApi", async () => {
  const actual = await vi.importActual<typeof import("@/api/chatApi")>("@/api/chatApi");
  return { ...actual, chatApi: { ...actual.chatApi, adminRooms: mocks.adminRooms } };
});
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ connected: true, emit: mocks.emit, on: mocks.on, off: mocks.off }),
}));
vi.mock("@/components/chat/TeacherChatConversation", () => ({
  default: ({ room }: { room: { id: string } }) => <div>conversation-{room.id}</div>,
}));

const renderChat = (active = true) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <LanguageProvider><AdminClassroomChat classroomId="classroom-1" active={active} /></LanguageProvider>
    </QueryClientProvider>,
  );
  return { ...view, client };
};

describe("AdminClassroomChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      mocks.handlers.set(event, handler);
    });
    mocks.adminRooms.mockResolvedValue([]);
  });

  it("does not fetch rooms while the Chat tab is inactive", () => {
    renderChat(false);
    expect(mocks.adminRooms).not.toHaveBeenCalled();
  });

  it("loads only returned classroom rooms in the current classroom context", async () => {
    mocks.adminRooms.mockResolvedValue([
      { id: "valid", type: "classroom", classroomId: "classroom-1", displayName: "محادثة الفصل الصحيحة" },
      { id: "support", type: "support", classroomId: "classroom-1", displayName: "دعم" },
      { id: "other", type: "classroom", classroomId: "classroom-2", displayName: "فصل آخر" },
    ]);
    renderChat();

    expect(await screen.findByText("محادثة الفصل الصحيحة")).toBeInTheDocument();
    expect(mocks.adminRooms).toHaveBeenCalledWith("classroom-1");
    expect(screen.queryByText("دعم")).not.toBeInTheDocument();
    expect(screen.queryByText("فصل آخر")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("محادثة الفصل الصحيحة"));
    expect(await screen.findByText("conversation-valid")).toBeInTheDocument();
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith("joinRoom", "valid"));
  });

  it("shows the classroom-specific empty state", async () => {
    renderChat();
    expect(await screen.findByText("لا توجد محادثات لهذا الفصل")).toBeInTheDocument();
  });

  it("deduplicates realtime messages and applies edit/delete/reconnect events only to scoped rooms", async () => {
    mocks.adminRooms.mockResolvedValue([
      { id: "valid", type: "classroom", classroomId: "classroom-1", displayName: "الفصل" },
    ]);
    const { client } = renderChat();
    fireEvent.click(await screen.findByText("الفصل"));
    await waitFor(() => expect(mocks.handlers.has("newMessage")).toBe(true));
    client.setQueryData(["admin-classroom-chat-messages", "valid"], {
      pages: [{ success: true, data: [], pagination: { hasMore: false, nextCursor: null } }],
      pageParams: [undefined],
    });

    await act(async () => {
      mocks.handlers.get("newMessage")?.({ _id: "m1", room: "valid", text: "الأولى" });
      mocks.handlers.get("newMessage")?.({ _id: "m1", room: "valid", text: "مكررة" });
      mocks.handlers.get("newMessage")?.({ _id: "outside", room: "other", text: "خارج الفصل" });
    });
    const afterNew = client.getQueryData<{ pages: Array<{ data: Array<{ id: string; text?: string }> }> }>(
      ["admin-classroom-chat-messages", "valid"],
    );
    expect(afterNew?.pages[0].data).toEqual([{ id: "m1", _id: "m1", room: "valid", text: "الأولى" }]);

    await act(async () => {
      mocks.handlers.get("messageEdited")?.({ _id: "m1", room: "valid", text: "معدلة" });
    });
    const afterEdit = client.getQueryData<{ pages: Array<{ data: Array<{ text?: string }> }> }>(
      ["admin-classroom-chat-messages", "valid"],
    );
    expect(afterEdit?.pages[0].data[0].text).toBe("معدلة");

    await act(async () => {
      mocks.handlers.get("messageDeleted")?.({ roomId: "valid", messageId: "m1" });
      mocks.handlers.get("connect")?.();
    });
    const afterDelete = client.getQueryData<{ pages: Array<{ data: unknown[] }> }>(
      ["admin-classroom-chat-messages", "valid"],
    );
    expect(afterDelete?.pages[0].data).toEqual([]);
    expect(mocks.emit).toHaveBeenCalledWith("joinRoom", "valid");
    expect(mocks.emit).toHaveBeenCalledWith("markAsRead", "valid");
  });
});
