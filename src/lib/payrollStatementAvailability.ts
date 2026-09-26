import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";

const dateOnly = (value: string) => {
  const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export const findOverlappingTeacherStatement = (
  statements: TeacherPayrollStatement[],
  teacherId: string,
  from: string,
  to: string,
) => {
  const requestedFrom = dateOnly(from);
  const requestedTo = dateOnly(to);
  if (!requestedFrom || !requestedTo) return undefined;

  return statements.find((statement) => {
    const existingFrom = dateOnly(statement.period.from);
    const existingTo = dateOnly(statement.period.to);
    return statement.teacher.id === teacherId
      && Boolean(existingFrom && existingTo)
      && existingFrom <= requestedTo
      && existingTo >= requestedFrom;
  });
};
