import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { getAdminStudent, listAdminStudents } from "@/api/adminStudentsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin students API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  it("serializes the exact student filters and pagination", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 2, last_page: 3, per_page: 20, total: 41 } });
    await listAdminStudents({ search: "Ali", status: "active", registrationType: "academic", registrationStatus: "approved", page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/students?search=Ali&status=active&registrationType=academic&registrationStatus=approved&page=2&limit=20");
  });
  it("loads a student detail", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "student-1" } });
    await expect(getAdminStudent("student-1")).resolves.toEqual({ id: "student-1" });
    expect(apiRequest).toHaveBeenCalledWith("/admin/students/student-1");
  });
});
