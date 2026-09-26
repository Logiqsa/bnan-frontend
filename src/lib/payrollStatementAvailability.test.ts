import { describe, expect, it } from "vitest";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import { findOverlappingTeacherStatement } from "./payrollStatementAvailability";

const statement = (
  id: string,
  teacherId: string,
  status: TeacherPayrollStatement["status"],
  changes: Partial<TeacherPayrollStatement> = {},
): TeacherPayrollStatement => ({
  id,
  teacher: { id: teacherId, fullName: teacherId, email: null },
  curriculum: { id: "curriculum-1", name: "Curriculum" },
  period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-26T23:59:59.999Z" },
  generalSubscription: { hours: 0, details: [], amount: 0 },
  courses: [], bonuses: 0, deductions: 0, finalAmount: 0, currency: "EGP",
  status, sentAt: status === "draft" ? null : "2026-09-26T12:00:00.000Z", payment: null,
  createdAt: "2026-09-26T12:00:00.000Z", updatedAt: "2026-09-26T12:00:00.000Z",
  ...changes,
});

describe("findOverlappingTeacherStatement", () => {
  const from = "2026-09-01";
  const to = "2026-09-15";

  it("keeps a teacher without a statement available", () => {
    expect(findOverlappingTeacherStatement([], "teacher-1", from, to)).toBeUndefined();
  });

  it.each(["draft", "sent", "paid"] as const)(
    "detects an existing %s statement for the same teacher and period",
    (status) => {
      const existing = statement(`statement-${status}`, "teacher-1", status, {
        period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-15T23:59:59.999Z" },
      });
      expect(findOverlappingTeacherStatement([existing], "teacher-1", from, to)).toBe(existing);
    },
  );

  it.each([
    ["same start with a later end", "2026-09-01", "2026-09-16"],
    ["starts inside the existing period", "2026-09-10", "2026-09-20"],
    ["starts on the existing end boundary", "2026-09-15", "2026-09-20"],
  ])("blocks a period that %s", (_label, requestedFrom, requestedTo) => {
    const existing = statement("statement-1", "teacher-1", "sent", {
      period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-15T23:59:59.999Z" },
    });
    expect(findOverlappingTeacherStatement([existing], "teacher-1", requestedFrom, requestedTo)).toBe(existing);
  });

  it.each([
    ["the following day", "2026-09-16", "2026-09-30"],
    ["the preceding month", "2026-08-01", "2026-08-31"],
  ])("allows a non-overlapping period beginning in %s", (_label, requestedFrom, requestedTo) => {
    const existing = statement("statement-1", "teacher-1", "sent", {
      period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-15T23:59:59.999Z" },
    });
    expect(findOverlappingTeacherStatement([existing], "teacher-1", requestedFrom, requestedTo)).toBeUndefined();
  });

  it("detects the duplicate even when its currency is different", () => {
    const differentCurrency = statement("statement-1", "teacher-1", "sent", { currency: "SAR" });
    expect(findOverlappingTeacherStatement([differentCurrency], "teacher-1", from, to)).toBe(differentCurrency);
  });

  it("detects the duplicate even when its curriculum is different", () => {
    const differentCurriculum = statement("statement-1", "teacher-1", "sent", {
      curriculum: { id: "curriculum-2", name: "Other curriculum" },
    });
    expect(findOverlappingTeacherStatement([differentCurriculum], "teacher-1", from, to)).toBe(differentCurriculum);
  });
});
