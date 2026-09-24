import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { chatApi } from "./chatApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("chatApi.send", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset().mockResolvedValue({
      success: true,
      data: { _id: "message-1", text: "sent" },
    });
  });

  it("preserves the JSON request for text-only messages", async () => {
    await chatApi.send("room-1", "hello");
    expect(apiRequest).toHaveBeenCalledWith("/chats/rooms/room-1/messages", {
      method: "POST",
      body: JSON.stringify({ text: "hello" }),
    });
  });

  it("uses multipart attachments without setting a manual content type", async () => {
    const first = new File(["one"], "one.txt", { type: "text/plain" });
    const second = new File(["two"], "two.pdf", { type: "application/pdf" });
    await chatApi.send("room-1", "  caption  ", [first, second]);

    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit;
    const body = options.body as FormData;
    expect(options.headers).toBeUndefined();
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("text")).toBe("caption");
    expect(body.getAll("attachments")).toEqual([first, second]);
  });

  it("supports attachment-only multipart messages without an empty text field", async () => {
    const file = new File(["one"], "one.txt", { type: "text/plain" });
    await chatApi.send("room-1", "", [file]);

    const body = vi.mocked(apiRequest).mock.calls[0][1]?.body as FormData;
    expect(body.has("text")).toBe(false);
    expect(body.getAll("attachments")).toEqual([file]);
  });
});

describe("chatApi classroom Admin contract", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("requests only classroom rooms for the selected classroom and follows scoped pagination", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        success: true,
        data: [{ _id: "room-1", type: "classroom", classroomId: "classroom/1" }],
        currentPage: 1,
        totalPages: 2,
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ _id: "room-2", type: "classroom", classroomId: "classroom/1" }],
        currentPage: 2,
        totalPages: 2,
        hasNextPage: false,
      });

    await expect(chatApi.adminRooms("classroom/1")).resolves.toEqual([
      expect.objectContaining({ id: "room-1" }),
      expect.objectContaining({ id: "room-2" }),
    ]);
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/chats/admin/rooms?type=classroom&classroomId=classroom%2F1&page=1&limit=100",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/chats/admin/rooms?type=classroom&classroomId=classroom%2F1&page=2&limit=100",
    );
  });

  it("uses the existing cursor, read, edit, and delete contracts", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ success: true, data: [], pagination: { hasMore: false, nextCursor: null } })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true, data: { _id: "message-1", text: "updated" } })
      .mockResolvedValueOnce({ success: true });

    await chatApi.messages("room-1", "next cursor");
    await chatApi.read("room-1");
    await chatApi.editMessage("message-1", "updated");
    await chatApi.deleteMessage("room-1", "message-1");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/chats/rooms/room-1/messages?limit=50&cursor=next+cursor");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/chats/rooms/room-1/read", { method: "PATCH" });
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/messages/message-1", {
      method: "PATCH",
      body: JSON.stringify({ text: "updated" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(4, "/chats/rooms/room-1/messages", {
      method: "DELETE",
      body: JSON.stringify({ messageIds: ["message-1"] }),
    });
  });
});
