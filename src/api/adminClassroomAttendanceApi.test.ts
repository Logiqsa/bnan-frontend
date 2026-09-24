import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminClassroomAttendanceApi } from "./adminClassroomAttendanceApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("adminClassroomAttendanceApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the classroom-scoped endpoint and preserves supported query names", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    await adminClassroomAttendanceApi.listClassroomAttendance("classroom/1", { page: 2, limit: 20, session: "session-1", student: "student-1", status: "late", from: "2026-09-01", to: "2026-09-30" });
    expect(apiRequest).toHaveBeenCalledWith("/admin/classrooms/classroom%2F1/attendance?page=2&limit=20&session=session-1&student=student-1&status=late&from=2026-09-01&to=2026-09-30");
  });
});
