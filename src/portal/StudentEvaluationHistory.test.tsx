import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ApiError } from "@/api/client";
import StudentEvaluationHistory from "./StudentEvaluationHistory";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/studentEvaluationsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentEvaluationsApi")>()),
  studentEvaluationsApi: { getMyWeeklyEvaluations: mocks.get },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const evaluation = {
  id: "ev-1", attendance: "present" as const, participation: "excellent" as const,
  homework: "very_good" as const, behavior: "good" as const, bonus: 2, bouns: 2,
  notes: "استمر", createdByRole: "teacher" as const,
  createdAt: "2026-09-20T10:00:00.000Z", updatedAt: "2026-09-21T10:00:00.000Z",
};
const egyptian = (week: number) => ({
  success: true as const, results: 2,
  data: { student: { id: "s1" }, mode: "egyptian" as const, classroom: { id: "c1", name: "الفصل العام" }, grade: { id: "g1", name: "الصف الأول" }, curriculum: { id: "cu1", name: "المصري" }, week, weekStart: "2026-09-20T00:00:00.000Z", subjects: [
    { id: "sub1", name: "الرياضيات", status: "evaluated" as const, evaluation },
    { id: "sub2", name: "العلوم", status: "not_evaluated" as const, evaluation: null },
  ] },
});
const gulf = {
  success: true as const, results: 2,
  data: { student: { id: "s1" }, mode: "gulf" as const, classroomsCount: 2, week: 1, weekStart: "2026-09-01T00:00:00.000Z", subjects: [] as [], classrooms: [
    { id: "c1", name: "فصل الرياضيات", grade: { id: "g1", name: "السادس" }, curriculum: { id: "cu1", name: "السعودي" }, subject: { id: "sub1", name: "الرياضيات" }, evaluationStatus: "evaluated" as const, evaluation: { ...evaluation, attendance: "excused" as const, bonus: Number.NaN, bouns: 4, notes: "", createdByRole: "supervisor" as const } },
    { id: "c2", name: "فصل بدون مادة", grade: null, curriculum: null, subject: null, evaluationStatus: "not_available" as const, evaluation: null },
  ] },
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentEvaluationHistory /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentEvaluationHistory", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.get.mockReset(); });

  it("renders Egyptian evaluated and not-evaluated subjects without invented metrics", async () => {
    mocks.get.mockResolvedValue(egyptian(4));
    renderPage();
    expect(screen.getByLabelText("جاري تحميل سجل التقييمات")).toBeInTheDocument();
    expect(await screen.findByText("الأسبوع 4")).toBeInTheDocument();
    expect(screen.getByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("حاضر")).toBeInTheDocument();
    expect(screen.getByText("جيد جدًا")).toBeInTheDocument();
    expect(screen.getByText("استمر")).toBeInTheDocument();
    expect(screen.getByText("تم بواسطة معلم")).toBeInTheDocument();
    expect(screen.getByText("لم يتم تقييم المادة بعد")).toBeInTheDocument();
    expect(screen.queryByText(/نسبة|التقييم العام|اسم المعلم|اشتراك|دورة/)).not.toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith({});
  });

  it("renders Gulf evaluated and unavailable states with bonus alias fallback", async () => {
    mocks.get.mockResolvedValue(gulf);
    renderPage();
    expect(await screen.findByText("فصل الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("معذور")).toBeInTheDocument();
    expect(screen.getByText("النقاط الإضافية: 4")).toBeInTheDocument();
    expect(screen.getByText("لا توجد ملاحظات")).toBeInTheDocument();
    expect(screen.getByText("تم بواسطة مشرف")).toBeInTheDocument();
    expect(screen.getByText("التقييم غير متاح لهذه المادة")).toBeInTheDocument();
    expect(screen.getByText("لا توجد أسابيع أقدم")).toBeInTheDocument();
  });

  it("renders every supported attendance and rating label without numeric conversion", async () => {
    const attendances = ["present", "absent", "late", "excused"] as const;
    const ratings = ["excellent", "very_good", "good", "acceptable", "weak", "-"] as const;
    const response = egyptian(1);
    response.data.subjects = ratings.map((rating, index) => ({
      id: `subject-${index}`,
      name: `مادة ${index + 1}`,
      status: "evaluated" as const,
      evaluation: {
        ...evaluation,
        id: `evaluation-${index}`,
        attendance: attendances[index % attendances.length],
        participation: rating,
        homework: rating,
        behavior: rating,
      },
    }));
    mocks.get.mockResolvedValue(response);
    renderPage();
    await screen.findByText("الأسبوع 1");
    ["حاضر", "غائب", "متأخر", "معذور", "ممتاز", "جيد جدًا", "جيد", "مقبول", "ضعيف", "—"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("loads exactly one previous week and appends it", async () => {
    mocks.get.mockResolvedValueOnce(egyptian(3)).mockResolvedValueOnce(egyptian(2));
    renderPage();
    await screen.findByText("الأسبوع 3");
    fireEvent.click(screen.getByRole("button", { name: "تحميل الأسبوع السابق" }));
    expect(await screen.findByText("الأسبوع 2")).toBeInTheDocument();
    expect(screen.getByText("الأسبوع 3")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenNthCalledWith(2, { week: 2 });
    expect(mocks.get.mock.calls.flat().join(" ")).not.toContain("week: 0");
  });

  it("keeps loaded history when an older week fails and allows retry", async () => {
    mocks.get.mockResolvedValueOnce(egyptian(3)).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce(egyptian(2));
    renderPage();
    await screen.findByText("الأسبوع 3");
    fireEvent.click(screen.getByRole("button", { name: "تحميل الأسبوع السابق" }));
    expect(await screen.findByText("تعذر تحميل سجل التقييمات.")).toBeInTheDocument();
    expect(screen.getByText("الأسبوع 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة محاولة تحميل الأسبوع السابق" }));
    expect(await screen.findByText("الأسبوع 2")).toBeInTheDocument();
  });

  it("shows a dedicated no-enrollment error and retries", async () => {
    mocks.get.mockRejectedValueOnce(new ApiError(404, "STUDENT_NOT_ENROLLED_IN_CLASSROOM", "not enrolled")).mockResolvedValueOnce(egyptian(1));
    renderPage();
    expect(await screen.findByText("لا يوجد فصل دراسي معتمد لعرض التقييمات.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("الأسبوع 1")).toBeInTheDocument();
  });
});
