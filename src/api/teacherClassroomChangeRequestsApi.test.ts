import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { teacherClassroomChangeRequestsApi } from "./teacherClassroomChangeRequestsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("teacherClassroomChangeRequestsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("sends only the classroom subject and reason for a teacher leave request", async () => {
    const request = { id: "request-1", status: "pending" as const };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: request });

    await expect(
      teacherClassroomChangeRequestsApi.createLeaveRequest({
        classroomId: "class/1",
        classroomSubjectId: "subject-1",
        notes: "لن أتمكن من الاستمرار لظرف طارئ",
      }),
    ).resolves.toBe(request);

    expect(apiRequest).toHaveBeenCalledWith(
      "/classrooms/class%2F1/teacher-requests",
      {
        method: "POST",
        body: JSON.stringify({
          classroomSubjectId: "subject-1",
          notes: "لن أتمكن من الاستمرار لظرف طارئ",
        }),
      },
    );
  });

  it("loads the teacher's existing classroom change requests", async () => {
    const requests = [{ id: "request-1", classroomSubject: "subject-1", status: "pending" as const }];
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: requests });

    await expect(
      teacherClassroomChangeRequestsApi.listLeaveRequests("class/1"),
    ).resolves.toBe(requests);

    expect(apiRequest).toHaveBeenCalledWith(
      "/classrooms/class%2F1/change-requests",
    );
  });
});
