import { beforeEach, describe, expect, it } from "vitest";
import { gulfPaymentDraftStore, type GulfPaymentDraft } from "./tamaraDraft";

const registration: GulfPaymentDraft = { purpose: "registration", paymentId: "p1", provider: "tamara", checkoutUrl: "https://pay.test", idempotencyKey: "key", studentEmail: "student@test.com", createdAt: "2026-09-23T00:00:00.000Z" };
const subjectRequest: GulfPaymentDraft = { purpose: "subject_request", paymentId: "p2", provider: "paymob", checkoutUrl: "https://pay.test", createdAt: Date.now() };
const renewal: GulfPaymentDraft = { purpose: "renewal", paymentId: "p3", provider: "tamara", checkoutUrl: "https://pay.test/renewal", createdAt: Date.now() };
const courseEnrollment: GulfPaymentDraft = { purpose: "course_enrollment", paymentId: "p4", provider: "paymob", checkoutUrl: "https://pay.test/course", courseId: "course-1", mode: "individual", createdAt: Date.now() };

describe("gulfPaymentDraftStore", () => {
  beforeEach(() => localStorage.clear());
  it("accepts valid registration and subject-request drafts", () => {
    gulfPaymentDraftStore.save(registration);
    expect(gulfPaymentDraftStore.read()).toEqual(registration);
    gulfPaymentDraftStore.save(subjectRequest);
    expect(gulfPaymentDraftStore.read()).toEqual(subjectRequest);
  });
  it("accepts a minimal renewal draft without registration credentials", () => {
    gulfPaymentDraftStore.saveRenewal({ paymentId: "p3", provider: "tamara", checkoutUrl: "https://pay.test/renewal", createdAt: renewal.createdAt });
    expect(gulfPaymentDraftStore.read()).toEqual(renewal);
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("studentEmail");
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("password");
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("credentials");
  });
  it("keeps registration drafts backward compatible without optional fields", () => {
    const legacyCurrent = { purpose: "registration", paymentId: "p1", provider: "tamara", checkoutUrl: "", createdAt: "2026-09-23T00:00:00.000Z" };
    localStorage.setItem("bnan_gulf_payment_draft", JSON.stringify(legacyCurrent));
    expect(gulfPaymentDraftStore.read()).toEqual(legacyCurrent);
  });
  it("accepts an isolated course-enrollment draft", () => {
    gulfPaymentDraftStore.saveCourseEnrollment({ paymentId: "p4", provider: "paymob", checkoutUrl: "https://pay.test/course", courseId: "course-1", mode: "individual", createdAt: courseEnrollment.createdAt });
    expect(gulfPaymentDraftStore.read()).toEqual(courseEnrollment);
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("studentEmail");
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("subscriptionId");
  });
  it.each([
    { purpose: "renewal", provider: "tamara", checkoutUrl: "", createdAt: Date.now() },
    { purpose: "renewal", paymentId: "p", provider: "other", checkoutUrl: "", createdAt: Date.now() },
    { purpose: "renewal", paymentId: "p", provider: "tamara", checkoutUrl: "", createdAt: 0 },
    { purpose: "renewal", paymentId: "p", provider: "tamara", checkoutUrl: "", createdAt: Date.now(), studentEmail: "student@test.com" },
    { purpose: "renewal", paymentId: "p", provider: "tamara", checkoutUrl: "", createdAt: Date.now(), password: "secret" },
    { purpose: "subject_request", provider: "tamara", checkoutUrl: "", createdAt: Date.now() },
    { purpose: "subject_request", paymentId: "p", provider: "other", checkoutUrl: "", createdAt: Date.now() },
    { purpose: "course_enrollment", paymentId: "p", provider: "paymob", checkoutUrl: "https://pay.test", createdAt: Date.now(), mode: "group" },
    { purpose: "course_enrollment", paymentId: "p", provider: "paymob", checkoutUrl: "https://pay.test", createdAt: Date.now(), courseId: "course-1", mode: "invalid" },
    { purpose: "course_enrollment", paymentId: "p", provider: "paymob", checkoutUrl: "https://pay.test", createdAt: Date.now(), courseId: "course-1", mode: "group", studentEmail: "student@test.com" },
  ])("rejects unsupported or incomplete draft %#", (value) => {
    localStorage.setItem("bnan_gulf_payment_draft", JSON.stringify(value));
    expect(gulfPaymentDraftStore.read()).toBeNull();
  });
  it("returns null for malformed JSON", () => {
    localStorage.setItem("bnan_gulf_payment_draft", "{");
    expect(gulfPaymentDraftStore.read()).toBeNull();
  });
  it("does not require registration-only fields for subject requests", () => {
    gulfPaymentDraftStore.saveSubjectRequest({ paymentId: "p2", provider: "tamara", checkoutUrl: "", createdAt: Date.now() });
    expect(gulfPaymentDraftStore.read()).toMatchObject({ purpose: "subject_request", paymentId: "p2" });
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("studentEmail");
    expect(gulfPaymentDraftStore.read()).not.toHaveProperty("idempotencyKey");
  });
});
