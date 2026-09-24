import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { testimonialApi } from "./testimonialApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("testimonialApi admin contract", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("lists using the backend status and pagination contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [], page: 2, limit: 50, total: 0, hasNextPage: false });
    await testimonialApi.admin.list("pending", 2, 50);
    expect(apiRequest).toHaveBeenCalledWith("/admin/testimonials?page=2&limit=50&status=pending");
  });

  it("keeps approve and unapprove and exposes no unsupported delete method", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await testimonialApi.admin.approve("testimonial-1");
    expect(apiRequest).toHaveBeenCalledWith("/admin/testimonials/testimonial-1/approve", { method: "PATCH" });
    await testimonialApi.admin.unapprove("testimonial-1");
    expect(apiRequest).toHaveBeenCalledWith("/admin/testimonials/testimonial-1/unapprove", { method: "PATCH" });
    expect("delete" in testimonialApi.admin).toBe(false);
  });
});
