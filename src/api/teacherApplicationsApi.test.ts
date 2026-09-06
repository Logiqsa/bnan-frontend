import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { teacherApplicationsApi } from "./teacherApplicationsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("teacherApplicationsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses totalPages when the API page contains fewer than the requested limit", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      success: true,
      data: Array.from({ length: 7 }, (_, index) => ({
        id: `application-${index + 1}`,
        status: "pending",
      })),
      currentPage: 1,
      totalCount: 19,
      totalPages: 3,
      limit: 7,
    });

    const result = await teacherApplicationsApi.list("pending", 1);

    expect(result).toMatchObject({
      page: 1,
      total: 19,
      totalPages: 3,
      hasNextPage: true,
    });
  });

  it("disables the next page on the final page", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      success: true,
      data: [{ id: "application-19", status: "pending" }],
      currentPage: 3,
      totalCount: 19,
      totalPages: 3,
      limit: 7,
    });

    const result = await teacherApplicationsApi.list("pending", 3);

    expect(result.hasNextPage).toBe(false);
  });

  it("sends the user-selected page size to the API", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      success: true,
      data: [],
      currentPage: 1,
      totalCount: 0,
      totalPages: 0,
    });

    await teacherApplicationsApi.list("approved", 2, 50);

    expect(apiRequest).toHaveBeenCalledWith("/teachers?status=approved&page=2&limit=50");
  });

  it("counts only applications returned for the selected status", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: "pending-1", status: "pending" },
          { id: "pending-2", status: "pending" },
        ],
        currentPage: 1,
        totalCount: 19,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: "pending-3", status: "pending" }],
        currentPage: 2,
        totalCount: 19,
        totalPages: 2,
      });

    await expect(teacherApplicationsApi.countByStatus("pending")).resolves.toBe(3);
  });
});
