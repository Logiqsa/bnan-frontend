import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { globalNotificationsApi } from "./globalNotificationsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("globalNotificationsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses JSON when no image is selected", () => {
    globalNotificationsApi.sendGlobalNotification({ title: "عنوان", audiences: ["all"], curriculumIds: ["curriculum-1"] });
    expect(apiRequest).toHaveBeenCalledWith("/notifications/global", { method: "POST", body: JSON.stringify({ title: "عنوان", audiences: ["all"], curriculumIds: ["curriculum-1"] }) });
  });

  it("uses FormData with field name image and no manual Content-Type", () => {
    const image = new File(["image"], "notice.webp", { type: "image/webp" });
    globalNotificationsApi.sendGlobalNotification({ title: "عنوان", content: "محتوى", audiences: ["teacher"], curriculumIds: ["curriculum-1"] }, image);
    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit; const body = options.body as FormData;
    expect(options.headers).toBeUndefined(); expect(body).toBeInstanceOf(FormData);
    expect(body.get("title")).toBe("عنوان"); expect(body.get("content")).toBe("محتوى"); expect(body.get("audiences")).toBe('["teacher"]'); expect(body.get("curriculumIds")).toBe('["curriculum-1"]'); expect(body.get("image")).toBe(image);
  });

  it("omits empty content from multipart", () => {
    globalNotificationsApi.sendGlobalNotification({ title: "عنوان", audiences: ["parent"], curriculumIds: ["curriculum-1"] }, new File(["x"], "x.png", { type: "image/png" }));
    const body = vi.mocked(apiRequest).mock.calls[0][1]?.body as FormData;
    expect(body.has("content")).toBe(false); expect(body.get("audiences")).toBe('["parent"]');
  });

  it("supports sending to all curricula", () => {
    globalNotificationsApi.sendGlobalNotification({ title: "إعلان عام", audiences: ["all"], curriculumIds: ["all"] });
    expect(apiRequest).toHaveBeenCalledWith("/notifications/global", {
      method: "POST",
      body: JSON.stringify({ title: "إعلان عام", audiences: ["all"], curriculumIds: ["all"] }),
    });
  });
});
