import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentSubjectRequestsApi } from "./studentSubjectRequestsApi";
vi.mock("./client", () => ({ apiRequest: vi.fn() }));
describe("studentSubjectRequestsApi payment verification", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  it("loads available subjects from the confirmed endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { curriculum: { id: "c1", name: "Gulf" }, grade: { id: "g1", name: "Grade" }, subjects: [] } });
    await studentSubjectRequestsApi.availableSubjects();
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests/available-subjects");
  });
  it("creates one subject checkout with the idempotency header", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { paymentId: "p1", checkoutUrl: "https://pay.test", status: "pending" } });
    const body = { subjectId: "s1", packageId: "pk1", provider: "paymob" as const, locale: "ar_SA" as const, isMobile: false as const };
    await studentSubjectRequestsApi.checkout(body, "attempt-1");
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": "attempt-1" },
    });
  });
  it("submits the confirmed direct Egyptian request payload", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: [{ subjectRequestId: "r1", subject: { id: "s1", name: "Math" }, status: "awaiting_admin_approval" }] });
    const body = { subjectIds: ["s1"] as [string], packageId: "pk1", notes: "note" };
    await studentSubjectRequestsApi.requestAdditional(body);
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests", { method: "POST", body: JSON.stringify(body) });
  });
  it("uses the subject-request status endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { paymentId: "p/1", status: "pending" } });
    await studentSubjectRequestsApi.checkoutStatus("p/1");
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests/checkout/p%2F1/status");
  });
  it("exposes the confirmed reconcile contract without invoking it implicitly", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { paymentId: "p1", status: "completed" } });
    await studentSubjectRequestsApi.reconcileCheckout("p1");
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests/checkout/p1/reconcile", { method: "POST" });
  });
});
