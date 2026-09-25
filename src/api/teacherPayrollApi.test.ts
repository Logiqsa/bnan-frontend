import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { teacherPayrollApi } from "./teacherPayrollApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("teacherPayrollApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("lists only the current teacher's payrolls without an admin endpoint", async () => {
    const data = { summary: [], payrolls: [] };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data });
    await expect(teacherPayrollApi.list()).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payrolls");
  });

  it("passes supported status filters to the teacher endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: { summary: [], payrolls: [] } });
    await teacherPayrollApi.list("paid");
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payrolls?status=paid");
  });

  it("gets a single current-teacher payroll by encoded id", async () => {
    const payroll = { id: "one" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: payroll });
    await expect(teacherPayrollApi.get("one/two")).resolves.toEqual(payroll);
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payrolls/one%2Ftwo");
  });
});
