import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentClassroomChangeRequestsApi } from "./studentClassroomChangeRequestsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentClassroomChangeRequestsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("creates a request with only the supported body", async () => {
    const created = { id: "request-1", status: "pending" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: created });
    await expect(studentClassroomChangeRequestsApi.createChangeRequest({ classroomId: "class/1", classroomSubjectId: "cs-1", requestType: "change_teacher", notes: "سبب واضح" })).resolves.toBe(created);
    expect(apiRequest).toHaveBeenCalledWith("/classrooms/class%2F1/change-requests", {
      method: "POST",
      body: JSON.stringify({ classroomSubjectId: "cs-1", requestType: "change_teacher", notes: "سبب واضح" }),
    });
    const serialized = JSON.stringify(vi.mocked(apiRequest).mock.calls[0]);
    expect(serialized).not.toMatch(/studentId|teacherId|replacementTeacher|subscriptionId|paymentId|refund/);
  });

  it("loads classroom-scoped history from the exact endpoint", async () => {
    const requests = [{ id: "request-1", requestType: "cancel_subject", status: "approved" }];
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: requests });
    await expect(studentClassroomChangeRequestsApi.listChangeRequests("classroom-1")).resolves.toBe(requests);
    expect(apiRequest).toHaveBeenCalledWith("/classrooms/classroom-1/change-requests");
  });

  it("loads the student-only eligible classroom subject context", async () => {
    const context = [{ classroomId: "classroom-1", classroomName: "فصل", classroomSubjectId: "cs-1", subject: { id: "subject-1", name: "رياضيات" }, teacher: null }];
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: context });
    await expect(studentClassroomChangeRequestsApi.getContext()).resolves.toBe(context);
    expect(apiRequest).toHaveBeenCalledWith("/students/me/change-requests/context");
  });
});
