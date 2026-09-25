import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentReturnDispatcher from "./PaymentReturnDispatcher";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { read: mocks.read } }));
vi.mock("@/pages/TamaraReturn", () => ({ default: () => <div>registration return</div> }));
vi.mock("@/pages/StudentSubjectRequestReturn", () => ({ default: () => <div>subject request return</div> }));
vi.mock("@/pages/StudentSubscriptionRenewalReturn", () => ({ default: () => <div>renewal return</div> }));
vi.mock("@/pages/StudentCourseEnrollmentReturn", () => ({ default: () => <div>course enrollment return</div> }));
describe("PaymentReturnDispatcher", () => {
  it("preserves registration routing", () => { mocks.read.mockReturnValue({ purpose: "registration" }); render(<PaymentReturnDispatcher kind="success" />); expect(screen.getByText("registration return")).toBeInTheDocument(); });
  it("routes subject-request drafts separately", () => { mocks.read.mockReturnValue({ purpose: "subject_request" }); render(<PaymentReturnDispatcher kind="success" />); expect(screen.getByText("subject request return")).toBeInTheDocument(); });
  it("routes renewal drafts explicitly and never falls through to registration", () => { mocks.read.mockReturnValue({ purpose: "renewal" }); render(<PaymentReturnDispatcher kind="success" />); expect(screen.getByText("renewal return")).toBeInTheDocument(); expect(screen.queryByText("registration return")).not.toBeInTheDocument(); });
  it("routes course-enrollment drafts independently from registration", () => { mocks.read.mockReturnValue({ purpose: "course_enrollment" }); render(<PaymentReturnDispatcher kind="success" />); expect(screen.getByText("course enrollment return")).toBeInTheDocument(); expect(screen.queryByText("registration return")).not.toBeInTheDocument(); });
  it("keeps the existing safe fallback for invalid or missing drafts", () => { mocks.read.mockReturnValue(null); render(<PaymentReturnDispatcher kind="failure" />); expect(screen.getByText("registration return")).toBeInTheDocument(); });
});
