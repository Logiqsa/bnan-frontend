import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { certificateFilesApi } from "./certificateFilesApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("certificateFilesApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("requests a certificate PDF as an authenticated blob response", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    vi.mocked(apiRequest).mockResolvedValue(blob);

    await expect(certificateFilesApi.getCertificateFile("certificate/1", "pdf")).resolves.toBe(blob);
    expect(apiRequest).toHaveBeenCalledWith(
      "/certificates/certificate%2F1/file?type=pdf",
      { responseType: "blob" },
    );
  });

  it("requests a certificate preview as an authenticated blob response", async () => {
    const blob = new Blob(["preview"], { type: "image/png" });
    vi.mocked(apiRequest).mockResolvedValue(blob);

    await expect(certificateFilesApi.getCertificateFile("certificate-1", "preview")).resolves.toBe(blob);
    expect(apiRequest).toHaveBeenCalledWith(
      "/certificates/certificate-1/file?type=preview",
      { responseType: "blob" },
    );
  });
});
