import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentCertificatesApi } from "./studentCertificatesApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentCertificatesApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads modern certificates from the current-user endpoint", async () => {
    const data = [{ _id: "modern-1", certificateNumber: "CERT-1" }];
    vi.mocked(apiRequest).mockResolvedValue({ success: true, length: 1, data });
    await expect(studentCertificatesApi.getMyCertificates()).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith("/certificates/my");
  });
});
