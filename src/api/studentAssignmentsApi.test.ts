import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentAssignmentsApi } from "./studentAssignmentsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentAssignmentsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads the current Student's global assignments", async () => {
    const assignments = [{ id: "a1", title: "واجب" }];
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: assignments });

    await expect(studentAssignmentsApi.list()).resolves.toEqual(assignments);
    expect(apiRequest).toHaveBeenCalledWith("/students/me/assignments");
  });

  it("submits only one attachment using the supported multipart contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "submission-1" } });
    const file = new File(["answer"], "answer.pdf", { type: "application/pdf" });

    await studentAssignmentsApi.submitAssignment("assignment/1", file);

    expect(apiRequest).toHaveBeenCalledWith(
      "/assignments/assignment%2F1/submit",
      expect.objectContaining({ method: "POST" }),
    );
    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit;
    expect(options.body).toBeInstanceOf(FormData);
    const body = options.body as FormData;
    expect(body.get("attachment")).toBe(file);
    expect([...body.keys()]).toEqual(["attachment"]);
  });
});
