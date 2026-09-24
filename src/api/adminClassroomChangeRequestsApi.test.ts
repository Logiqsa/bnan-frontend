import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { adminClassroomChangeRequestsApi } from "./adminClassroomChangeRequestsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("adminClassroomChangeRequestsApi", () => {
  it("loads the Admin request queue", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: [], total: 0 });
    await adminClassroomChangeRequestsApi.list({ status: "pending", requestType: "change_teacher" });
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/admin/classroom-change-requests?"));
    expect(vi.mocked(apiRequest).mock.calls[0][0]).toContain("status=pending");
    expect(vi.mocked(apiRequest).mock.calls[0][0]).toContain("requestType=change_teacher");
  });

  it("sends replacementTeacherId only when supplied", async () => {
    vi.mocked(apiRequest).mockClear();
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await adminClassroomChangeRequestsApi.approve("request-1", { replacementTeacherId: "teacher-1", adminNotes: "ok" });
    expect(vi.mocked(apiRequest).mock.calls[0][1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(vi.mocked(apiRequest).mock.calls[0][1]?.body))).toEqual({ replacementTeacherId: "teacher-1", adminNotes: "ok" });

    vi.mocked(apiRequest).mockClear();
    await adminClassroomChangeRequestsApi.approve("request-2", {});
    expect(JSON.parse(String(vi.mocked(apiRequest).mock.calls[0][1]?.body))).toEqual({});
  });

  it("uses the existing reject endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await adminClassroomChangeRequestsApi.reject("request-3", { rejectionReason: "reason" });
    expect(apiRequest).toHaveBeenCalledWith("/admin/classroom-change-requests/request-3/reject", expect.objectContaining({ method: "PATCH" }));
  });
});
