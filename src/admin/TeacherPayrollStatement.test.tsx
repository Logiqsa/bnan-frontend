import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PayrollStatementTeacher } from "@/api/adminPayrollApi";
import TeacherPayrollStatement from "./TeacherPayrollStatement";

const statement: PayrollStatementTeacher = {
  teacherId: "teacher-1",
  fullName: "Teacher One",
  email: "teacher@example.com",
  general: {
    minutes: 120,
    displayDuration: "2h",
    sessionsCount: 2,
    items: [{ curriculumId: "curriculum-1", curriculumName: "Egyptian", gradeId: "grade-1", gradeName: "Grade 1", system: "egyptian", rateType: "session", minutes: 120, displayDuration: "2h", sessionsCount: 2, rate: null, amount: null }],
    gradeGroups: [{ gradeId: "grade-1", gradeName: "Grade 1", hourlyRate: 100, totalHours: 2, totalAmount: 200, sessions: [{ sessionId: "session-1", date: "2026-09-01T10:00:00Z", startTime: "2026-09-01T09:00:00Z", endTime: "2026-09-01T10:00:00Z", durationHours: 1, subject: "Math", gradeId: "grade-1", gradeName: "Grade 1", hourlyRate: 100, amount: 100, sourceType: "academic" }, { sessionId: "session-2", date: "2026-09-02T11:00:00Z", startTime: "2026-09-02T10:00:00Z", endTime: "2026-09-02T11:00:00Z", durationHours: 1, subject: "Math", gradeId: "grade-1", gradeName: "Grade 1", hourlyRate: 100, amount: 100, sourceType: "academic" }] }],
  },
  courses: [{ courseId: "course-1", courseName: "Math course", minutes: 90, displayDuration: "1h 30m", sessionsCount: 1, sessions: [{ sessionId: "course-session-1", date: "2026-09-03T12:30:00Z", startTime: "2026-09-03T11:00:00Z", endTime: "2026-09-03T12:30:00Z", durationHours: 1.5, hourlyRate: null, amount: null, sourceType: "course" }] }],
  excludedSessionsCount: 0,
  excludedSessions: [],
  payroll: { id: "payroll-1", status: "draft", currency: "SAR", bonus: 10, deduction: 2, total: 100, generalAmount: 92 },
};

describe("TeacherPayrollStatement", () => {
  it("separates general and course hours and calculates the editable course amount", () => {
    render(<TeacherPayrollStatement statement={statement} curriculumName="Egyptian" period={{ from: "2026-09-01", to: "2026-09-30" }} />);
    const screenView = within(screen.getByTestId("statement-screen"));
    expect(screenView.getByText("التعليم الأكاديمي")).toBeInTheDocument();
    expect(screenView.getByText("الدورات")).toBeInTheDocument();
    expect(screenView.getByText("الصف: Grade 1")).toBeInTheDocument();
    expect(screenView.getByText("Math course")).toBeInTheDocument();
    expect(screenView.getByText("إجمالي حصص الصف: ٢٠٠ ر.س")).toBeInTheDocument();
    expect(screenView.getAllByText("01:00").length).toBeGreaterThan(0);
    expect(screenView.queryByText("Student One")).not.toBeInTheDocument();
    expect(screenView.getByText(/المعلم: Teacher One/)).toBeInTheDocument();
    expect(screenView.getByText(/Egyptian · الفترة/)).toBeInTheDocument();
    fireEvent.change(screenView.getByLabelText("سعر ساعة Math course"), { target: { value: "40" } });
    expect(screenView.getAllByText(/٦٠ ر.س/).length).toBeGreaterThan(0);
    expect(screen.queryByText("صافي المستحق")).not.toBeInTheDocument();
    expect(screen.getAllByText("الإجمالي").length).toBeGreaterThan(0);
  });

  it("renders a dedicated non-interactive print report", () => {
    render(<TeacherPayrollStatement statement={statement} curriculumName="Egyptian" period={{ from: "2026-09-01", to: "2026-09-30" }} />);
    const printView = within(screen.getByTestId("statement-print"));
    expect(printView.getByText("التقرير المالي")).toBeInTheDocument();
    expect(printView.getByText("المعلم")).toBeInTheDocument();
    expect(printView.getAllByText("تاريخ الحصة").length).toBeGreaterThan(0);
    expect(printView.queryByText("أسعار ساعات الدورات")).not.toBeInTheDocument();
    expect(screen.getByTestId("statement-print").querySelectorAll("input, button, select, textarea")).toHaveLength(0);
    expect(printView.queryByText("Student One")).not.toBeInTheDocument();
    expect(screen.getByTestId("statement-print").parentElement).toBe(document.body);
  });
});
