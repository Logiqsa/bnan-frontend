import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";

const dateOnly = (value: string) => {
  const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export const findTeacherStatementForPeriod = (
  statements: TeacherPayrollStatement[],
  teacherId: string,
  from: string,
  to: string,
) => statements.find((statement) =>
  statement.teacher.id === teacherId
  && dateOnly(statement.period.from) === dateOnly(from)
  && dateOnly(statement.period.to) === dateOnly(to));
