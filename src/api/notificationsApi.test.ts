import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { notificationsApi } from "./notificationsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("notificationsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the backend list and read contracts", async () => {
    await notificationsApi.list(100);
    expect(apiRequest).toHaveBeenCalledWith("/notifications?page=1&limit=100");

    await notificationsApi.markRead(["one", "two"]);
    expect(apiRequest).toHaveBeenCalledWith("/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ notificationIds: ["one", "two"] }),
    });

    await notificationsApi.markAllRead();
    expect(apiRequest).toHaveBeenCalledWith("/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ all: true }),
    });
  });
});
