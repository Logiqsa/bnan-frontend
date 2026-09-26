import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { adminTeacherAssignmentApi } from "./adminTeacherAssignmentApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("adminTeacherAssignmentApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads classrooms scoped to the selected curriculum and grade", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: [] });
    await adminTeacherAssignmentApi.listClassrooms("curriculum-1", "grade-1");
    expect(apiRequest).toHaveBeenCalledWith("/classrooms?status=active&page=1&limit=100&curriculum=curriculum-1&grade=grade-1");
  });

  it("sends Teacher._id and the selected Subject._id", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: {} });
    await adminTeacherAssignmentApi.assign("classroom-1", "subject-1", "teacher-profile-1");
    expect(apiRequest).toHaveBeenCalledWith("/classrooms/classroom-1/teacher", {
      method: "PATCH",
      body: JSON.stringify({ subjectId: "subject-1", teacherId: "teacher-profile-1" }),
    });
  });
});
