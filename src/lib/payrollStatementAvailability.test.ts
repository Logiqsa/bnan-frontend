import { describe, expect, it } from "vitest";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import { findTeacherStatementForPeriod } from "./payrollStatementAvailability";

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

describe("findTeacherStatementForPeriod", () => {
  const from = "2026-09-01";
  const to = "2026-09-26";

  it("keeps a teacher without a statement available", () => {
    expect(findTeacherStatementForPeriod([], "teacher-1", from, to)).toBeUndefined();
  });

  it.each(["draft", "sent", "paid"] as const)(
    "detects an existing %s statement for the same teacher and period",
    (status) => {
      const existing = statement(`statement-${status}`, "teacher-1", status);
      expect(findTeacherStatementForPeriod([existing], "teacher-1", from, to)).toBe(existing);
    },
  );

  it("keeps a teacher with a statement in another period available", () => {
    const otherPeriod = statement("statement-1", "teacher-1", "sent", {
      period: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
    });
    expect(findTeacherStatementForPeriod([otherPeriod], "teacher-1", from, to)).toBeUndefined();
  });

  it("detects the duplicate even when its currency is different", () => {
    const differentCurrency = statement("statement-1", "teacher-1", "sent", { currency: "SAR" });
    expect(findTeacherStatementForPeriod([differentCurrency], "teacher-1", from, to)).toBe(differentCurrency);
  });

  it("detects the duplicate even when its curriculum is different", () => {
    const differentCurriculum = statement("statement-1", "teacher-1", "sent", {
      curriculum: { id: "curriculum-2", name: "Other curriculum" },
    });
    expect(findTeacherStatementForPeriod([differentCurriculum], "teacher-1", from, to)).toBe(differentCurriculum);
  });
});
