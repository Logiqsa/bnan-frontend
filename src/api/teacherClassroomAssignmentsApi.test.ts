import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { teacherClassroomAssignmentsApi } from "./teacherClassroomAssignmentsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("teacherClassroomAssignmentsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("requests assignments scoped to the classroom", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, results: 0, data: [] });
    await teacherClassroomAssignmentsApi.list("classroom-1");
    expect(apiRequest).toHaveBeenCalledWith("/classrooms/classroom-1/assignments");
  });
});
