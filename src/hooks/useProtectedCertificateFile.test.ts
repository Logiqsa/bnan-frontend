import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { certificateFilesApi } from "@/api/certificateFilesApi";
import { useProtectedCertificateFile } from "./useProtectedCertificateFile";

vi.mock("@/api/certificateFilesApi", () => ({
  certificateFilesApi: {
    getCertificateFile: vi.fn(),
  },
}));

const getCertificateFile = vi.mocked(certificateFilesApi.getCertificateFile);

describe("useProtectedCertificateFile", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => `blob:${blob.size}`),
      revokeObjectURL: vi.fn(),
    });
    getCertificateFile.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports loading and exposes the object URL after a Blob succeeds", async () => {
    const blob = new Blob(["certificate"], { type: "application/pdf" });
    getCertificateFile.mockResolvedValue(blob);

    const { result } = renderHook(() => useProtectedCertificateFile("c1", "pdf"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.url).toBeNull();

    await waitFor(() => expect(result.current.url).toBe(`blob:${blob.size}`));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("exposes errors and retries the current file request", async () => {
    const error = new Error("download failed");
    getCertificateFile.mockRejectedValueOnce(error).mockResolvedValueOnce(new Blob(["ok"]));

    const { result } = renderHook(() => useProtectedCertificateFile("c1", "preview"));
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.url).toBeNull();
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.url).toBe("blob:2"));
    expect(getCertificateFile).toHaveBeenCalledTimes(2);
    expect(getCertificateFile).toHaveBeenLastCalledWith("c1", "preview");
  });

  it("does not request or load anything when disabled", () => {
    const { result } = renderHook(() => useProtectedCertificateFile("c1", "pdf", false));

    expect(getCertificateFile).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ url: null, isLoading: false, error: null });
  });

  it("revokes the URL on unmount", async () => {
    getCertificateFile.mockResolvedValue(new Blob(["preview"]));
    const { result, unmount } = renderHook(() => useProtectedCertificateFile("c1", "preview"));
    await waitFor(() => expect(result.current.url).toBe("blob:7"));

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:7");
  });

  it("revokes the previous URL when the file changes", async () => {
    getCertificateFile
      .mockResolvedValueOnce(new Blob(["first"]))
      .mockResolvedValueOnce(new Blob(["second"]));
    const { result, rerender } = renderHook(
      ({ certificateId, type }: { certificateId: string; type: "pdf" | "preview" }) =>
        useProtectedCertificateFile(certificateId, type),
      { initialProps: { certificateId: "c1", type: "pdf" as const } },
    );
    await waitFor(() => expect(result.current.url).toBe("blob:5"));

    rerender({ certificateId: "c2", type: "pdf" });
    await waitFor(() => expect(result.current.url).toBe("blob:6"));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:5");
  });

  it("does not allow an older request to overwrite a newer request", async () => {
    let resolveFirst: (blob: Blob) => void = () => undefined;
    const firstRequest = new Promise<Blob>((resolve) => {
      resolveFirst = resolve;
    });
    getCertificateFile
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(new Blob(["new"]));

    const { result, rerender } = renderHook(
      ({ certificateId }: { certificateId: string }) =>
        useProtectedCertificateFile(certificateId, "pdf"),
      { initialProps: { certificateId: "old" } },
    );
    rerender({ certificateId: "new" });
    await waitFor(() => expect(result.current.url).toBe("blob:3"));

    act(() => resolveFirst(new Blob(["old"])));
    await waitFor(() => expect(result.current.url).toBe("blob:3"));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("handles cleanup safely when no URL was created", () => {
    getCertificateFile.mockRejectedValue(new Error("failed"));
    const { unmount } = renderHook(() => useProtectedCertificateFile("c1", "pdf"));

    expect(() => unmount()).not.toThrow();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
