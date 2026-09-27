import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { MemoryRouter } from "react-router-dom";
import StudentDashboard from "./StudentDashboard";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/studentHomeApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/studentHomeApi")>();
  return { ...actual, studentHomeApi: { get: mocks.get } };
});
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const data = {
  student: { id: "s1", userId: "u1", fullName: "طالب بنان", curriculum: { id: "c1", name: "المنهج السعودي", registrationMode: "gulf" as const }, grade: { id: "g1", name: "الصف السادس" } },
  subscription: { id: "sub1", summary: { packageName: "باقة التفوق", packageType: "hours", accessScope: "all_subjects", computedStatus: "active", isActive: true, totalHours: 20, usedHours: 5, remainingHours: 15, progressPercentage: 25, canRenew: true, hasPendingRenewal: false } },
  subscriptions: [] as never[],
  stats: { attendance: { percentage: 80, total: 10, present: 7, late: 2, absent: 1 }, interaction: { score: 4.5, maxScore: 5, evaluationsCount: 2 }, certificates: { count: 3 } },
  weeklyEvaluation: { evaluationsCount: 1, attendancePercentage: 100, participationPercentage: 85, homeworkPercentage: 70, behaviorPercentage: 100, bonusPoints: 2, teacherNote: "أداء متميز" },
  generatedAt: "2026-09-23T00:00:00.000Z",
};

const renderDashboard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentDashboard /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentDashboard", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.get.mockReset(); });

  it("renders identity, subscription, and attendance without evaluation UI", async () => {
    mocks.get.mockResolvedValue(data);
    renderDashboard();
    expect(screen.getByLabelText("جاري تحميل لوحة الطالب")).toBeInTheDocument();
    expect(await screen.findByText(/طالب بنان/)).toBeInTheDocument();
    expect(screen.getByText("المنهج السعودي • الصف السادس")).toBeInTheDocument();
    expect(screen.getByText("باقة التفوق")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.queryByText("التقييم الأسبوعي")).not.toBeInTheDocument();
    expect(screen.queryByText("عدد التقييمات")).not.toBeInTheDocument();
    expect(screen.queryByText("الشهادات")).not.toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

  it("shows distinct empty states and never turns a null attendance percentage into zero", async () => {
    mocks.get.mockResolvedValue({ ...data, subscription: null, subscriptions: [], stats: { attendance: { percentage: null, total: 0, present: 0, late: 0, absent: 0 }, interaction: null, certificates: null }, weeklyEvaluation: null });
    renderDashboard();
    expect(await screen.findByText("لا يوجد اشتراك حالي")).toBeInTheDocument();
    expect(screen.getByText("غير متاحة حاليًا")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByText("لا يوجد تقييم أسبوعي متاح حاليًا")).not.toBeInTheDocument();
    expect(screen.queryByText("بيانات التفاعل غير متاحة حاليًا")).not.toBeInTheDocument();
    expect(screen.queryByText("بيانات الشهادات غير متاحة حاليًا")).not.toBeInTheDocument();
  });

  it("shows an error and retries the same query", async () => {
    mocks.get
      .mockRejectedValueOnce(new Error("failed"))
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(data);
    renderDashboard();
    expect(await screen.findByText("تعذر تحميل بيانات لوحة الطالب", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(3));
    expect(await screen.findByText(/طالب بنان/)).toBeInTheDocument();
  });
});
