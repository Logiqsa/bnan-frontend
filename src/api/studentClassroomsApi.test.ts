import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentClassroomsApi } from "./studentClassroomsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentClassroomsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the Student-owned enrollments endpoint and normalizes classroom IDs", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [{ _id: "enrollment-1", status: "approved", classroom: { _id: "classroom-1", name: "Class one" } }] });
    await expect(studentClassroomsApi.myEnrollments()).resolves.toEqual([{ id: "enrollment-1", status: "approved", classroom: { id: "classroom-1", name: "Class one" } }]);
    expect(apiRequest).toHaveBeenCalledWith("/students/me/enrollments");
  });
});
