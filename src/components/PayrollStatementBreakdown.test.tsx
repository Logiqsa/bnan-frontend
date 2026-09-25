import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PayrollStatementBreakdown from "./PayrollStatementBreakdown";

const session = (sessionId: string, durationHours: number, amount: number | null = 0, hourlyRate = 150) => ({
  sessionId,
  date: "2026-09-01T10:00:00Z",
  startTime: null,
  endTime: null,
  durationHours,
  hourlyRate,
  amount,
  sourceType: "course" as const,
});

describe("PayrollStatementBreakdown", () => {
  it("renders every academic and course session, including tiny durations and zero amounts", () => {
    const { container } = render(<PayrollStatementBreakdown
      currency="EGP"
      general={{ hours: 1.5, amount: 250, gradeGroups: [
        { gradeId: "grade-1", gradeName: "Grade 1", hourlyRate: 150, totalHours: 1, totalAmount: 150, sessions: [session("academic-1", 0.17, 25.5)] },
        { gradeId: "grade-2", gradeName: "Grade 2", hourlyRate: 200, totalHours: 0.5, totalAmount: 100, sessions: [session("academic-2", 0.5, 100, 200)] },
      ] }}
      courses={[
        { course: "course-1", courseName: "Course One", hours: 1, hourlyRate: 150, amount: 0, sessions: [session("course-1", 0.001), session("course-2", 0.00005)] },
        { course: "course-2", courseName: "Course Two", hours: 1, hourlyRate: 80, amount: 80, sessions: [session("course-3", 1, 80, 80)] },
      ]}
    />);

    expect(screen.getByText("الصف: Grade 1")).toBeInTheDocument();
    expect(screen.getByText("الصف: Grade 2")).toBeInTheDocument();
    expect(screen.getByText("الدورة: Course One")).toBeInTheDocument();
    expect(screen.getByText("الدورة: Course Two")).toBeInTheDocument();
    expect(screen.getByText("00:10")).toBeInTheDocument();
    expect(screen.getByText("0.001 ساعة")).toBeInTheDocument();
    expect(screen.getByText("0.00005 ساعة")).toBeInTheDocument();
    expect(screen.getAllByText("٢٠٠ جنيه").length).toBeGreaterThan(0);
    expect(screen.getAllByText("٨٠ جنيه").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".payroll-session-row")).toHaveLength(5);
    expect(screen.queryAllByText("لا توجد تفاصيل جلسات محفوظة في هذا الكشف.")).toHaveLength(0);
    expect(screen.queryAllByText("لا توجد تفاصيل جلسات محفوظة لهذه الدورة.")).toHaveLength(0);
    expect(screen.queryByText("Student One")).not.toBeInTheDocument();
  });

  it("uses the fallback only when session details are absent", () => {
    render(<PayrollStatementBreakdown
      currency="EGP"
      general={{ hours: 1, amount: 150 }}
      courses={[{ course: "course-1", courseName: "Course One", hours: 1, hourlyRate: 150, amount: 150 }]}
    />);

    expect(screen.getByText("لا توجد تفاصيل جلسات محفوظة؛ إجمالي التعليم الأكاديمي: ١٥٠ جنيه")).toBeInTheDocument();
    expect(screen.getByText("لا توجد تفاصيل جلسات محفوظة لهذه الدورة.")).toBeInTheDocument();
  });

  it("renders long session tables without dropping rows", () => {
    const sessions = Array.from({ length: 30 }, (_, index) => session(`long-${index + 1}`, 1, 150));
    const { container } = render(<PayrollStatementBreakdown
      currency="EGP"
      general={{ hours: 30, amount: 4500, gradeGroups: [{ gradeId: "grade-long", gradeName: "Long Grade", hourlyRate: 150, totalHours: 30, totalAmount: 4500, sessions }] }}
      courses={[]}
    />);

    expect(container.querySelectorAll(".payroll-session-row")).toHaveLength(30);
    expect(container.querySelector("thead")).toBeInTheDocument();
  });
});
