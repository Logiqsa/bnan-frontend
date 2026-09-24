import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminCertificatesApi } from "./adminCertificatesApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("adminCertificatesApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("lists certificates with supported filters and pagination", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, length: 0, data: [], pagination: { current_page: 2, last_page: 3, per_page: 20, total: 41 } });
    await adminCertificatesApi.list({ certificateType: "student_monthly", status: "draft", gradeId: "grade-1", month: 9, year: 2026, page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/certificates/admin?certificateType=student_monthly&status=draft&gradeId=grade-1&month=9&year=2026&page=2&limit=20");
  });

  it("loads details, issues drafts, and deletes only through confirmed endpoints", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: { id: "certificate-1" } });
    await adminCertificatesApi.getById("certificate-1");
    expect(apiRequest).toHaveBeenCalledWith("/certificates/certificate-1");

    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: { certificates: [] } });
    await adminCertificatesApi.issueDrafts();
    expect(apiRequest).toHaveBeenCalledWith("/certificates/student-monthly/issue", { method: "POST" });

    vi.mocked(apiRequest).mockResolvedValueOnce(undefined);
    await adminCertificatesApi.deleteDraft("certificate-1");
    expect(apiRequest).toHaveBeenCalledWith("/certificates/certificate-1", { method: "DELETE" });
  });
});
