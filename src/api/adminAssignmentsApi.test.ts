import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminAssignmentsApi } from "@/api/adminAssignmentsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);

describe("adminAssignmentsApi", () => {
  it("uses the admin assignments list contract and omits empty filters", async () => {
    request.mockResolvedValueOnce({} as never);
    await adminAssignmentsApi.listAssignments({ page: 2, limit: 20, search: "math", status: "active", subject: "" });
    expect(request).toHaveBeenCalledWith("/admin/assignments?page=2&limit=20&search=math&status=active");
  });

  it("uses the assignment detail and submission contracts", async () => {
    request.mockClear();
    request.mockResolvedValue({} as never);
    await adminAssignmentsApi.getAssignment("assignment/1");
    await adminAssignmentsApi.listSubmissions("assignment/1", { page: 2, limit: 10 });
    await adminAssignmentsApi.getSubmission("assignment/1", "submission/2");
    expect(request).toHaveBeenNthCalledWith(1, "/admin/assignments/assignment%2F1");
    expect(request).toHaveBeenNthCalledWith(2, "/admin/assignments/assignment%2F1/submissions?page=2&limit=10");
    expect(request).toHaveBeenNthCalledWith(3, "/admin/assignments/assignment%2F1/submissions/submission%2F2");
  });
});
