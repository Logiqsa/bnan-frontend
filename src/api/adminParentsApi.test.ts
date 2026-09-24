import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { getAdminParent, listAdminParents } from "@/api/adminParentsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin parents API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  it("serializes parent filters and pagination", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 0, per_page: 20, total: 0 } });
    await listAdminParents({ search: "Parent", status: "active", phone: "010", whatsappNumber: "011", from: "2026-01-01", to: "2026-01-31", page: 1, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/parents?search=Parent&status=active&phone=010&whatsappNumber=011&from=2026-01-01&to=2026-01-31&page=1&limit=20");
  });
  it("loads parent details", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "parent-1", children: [] } });
    await expect(getAdminParent("parent-1")).resolves.toEqual({ id: "parent-1", children: [] });
    expect(apiRequest).toHaveBeenCalledWith("/admin/parents/parent-1");
  });
});
