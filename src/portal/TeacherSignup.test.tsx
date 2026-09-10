import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSignup from "./TeacherSignup";
import { serializeTeacherSignupDraft } from "@/lib/teacherSignupDraft";

const mocks = vi.hoisted(() => ({
  registerTeacher: vi.fn(),
  reportClientError: vi.fn(),
  curriculums: vi.fn(),
  grades: vi.fn(),
  subjects: vi.fn(),
}));

vi.mock("@/api/authApi", () => ({
  authApi: { registerTeacher: mocks.registerTeacher },
}));
vi.mock("@/lib/clientErrorReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clientErrorReporting")>();
  return { ...actual, reportClientError: mocks.reportClientError };
});
vi.mock("@/api/catalogApi", () => ({
  catalogApi: {
    curriculums: mocks.curriculums,
    grades: mocks.grades,
    subjects: mocks.subjects,
  },
}));
vi.mock("@/api/countriesApi", () => ({ getCountries: vi.fn().mockResolvedValue([]) }));
vi.mock("@/api/contentApi", () => ({ contentApi: { getLegalPage: vi.fn() } }));
vi.mock("@/components/AccountVerification", () => ({ default: () => <div>verification</div> }));
vi.mock("@/lib/compress-upload-image", () => ({
  isImageFile: () => false,
  compressUploadImage: vi.fn((file: File) => Promise.resolve(file)),
}));

const draftKey = "bnan_teacher_signup_draft";
const persistentDraftKey = "bnan_teacher_signup_persistent_draft";
const password = "CurrentPassword123!";
const file = (name: string, type = "application/pdf") => new File(["content"], name, { type });

describe("TeacherSignup password flow", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:preview"),
    });
    sessionStorage.clear();
    localStorage.clear();
    mocks.registerTeacher.mockReset().mockResolvedValue({ data: { email: "teacher@example.com" } });
    mocks.reportClientError.mockReset().mockResolvedValue(undefined);
    mocks.curriculums.mockReset().mockResolvedValue({
      data: [{ id: "curriculum-1", name: "المنهج", registrationMode: "gulf", isActive: true }],
    });
    mocks.grades.mockReset().mockResolvedValue({
      data: [{ id: "grade-1", name: "الصف الأول ابتدائي", isActive: true }],
    });
    mocks.subjects.mockReset().mockResolvedValue({
      data: [{ id: "subject-1", name: "رياضيات", isActive: true }],
    });

    sessionStorage.setItem(draftKey, serializeTeacherSignupDraft({
      idempotencyKey: "signup-key",
      step: 0,
      curriculumStage: "subjects",
      values: {
        fullName: "Teacher Name",
        email: "teacher@example.com",
        password: "stale-password-that-must-not-be-restored",
        phone: "01000000000",
        termsAccepted: "true",
        dateOfBirth: "1990-01-01",
        whatsapp: "01000000000",
        nationality: "EG",
        country: "EG",
        city: "Cairo",
        degree: "bachelor",
        specialization: "Math",
        graduationYear: "2012",
        graduationGrade: "excellent",
        availableHoursPerWeek: "10",
        computerSkillLevel: "excellent",
        hasTeachingExperience: "true",
        hasOnlineTeachingExperience: "true",
        hasLaptop: "true",
        hasStableInternet: "true",
        hasGoodCamera: "true",
        hasMicrophone: "true",
        canProvideDemoSession: "true",
        introVideoUrl: "https://example.com/video",
        joiningReason: "سبب الانضمام",
        weakStudentHandling: "خطة التعامل",
      },
      selectedCurriculum: "curriculum-1",
      selectedGrades: ["grade-1"],
      assignments: { "grade-1": ["subject-1"] },
      activeGrade: "grade-1",
      additionalCurriculums: [],
    }));
  });

  const reachFinalStep = async () => {
    fireEvent.change(screen.getByLabelText("كلمة المرور *"), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    fireEvent.change(screen.getByLabelText("السيرة الذاتية *"), { target: { files: [file("cv.pdf")] } });
    fireEvent.change(screen.getByLabelText("شهادة التخرج *"), { target: { files: [file("degree.pdf")] } });
    fireEvent.change(screen.getByLabelText("البطاقة الشخصية *"), { target: { files: [file("id.pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    await screen.findByText("اختر المواد لكل صف");
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    await screen.findByText("مراجعة الملفات");
    fireEvent.change(screen.getByLabelText(/إثبات سرعة واستقرار الإنترنت/), {
      target: { files: [file("speed.png", "image/png")] },
    });
  };

  const apiFailure = (code: string, message: string, data?: Record<string, unknown>) =>
    Object.assign(new Error(message), { code, status: 0, data });

  it("keeps the current password in memory through review and includes it in the final FormData", async () => {
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);

    const passwordInput = screen.getByLabelText("كلمة المرور *");
    expect(passwordInput).toHaveValue("");
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));

    fireEvent.change(screen.getByLabelText("السيرة الذاتية *"), { target: { files: [file("cv.pdf")] } });
    fireEvent.change(screen.getByLabelText("شهادة التخرج *"), { target: { files: [file("degree.pdf")] } });
    fireEvent.change(screen.getByLabelText("البطاقة الشخصية *"), { target: { files: [file("id.pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));

    await screen.findByText("اختر المواد لكل صف");
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    expect(await screen.findByText("مراجعة الملفات")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/إثبات سرعة واستقرار الإنترنت/), {
      target: { files: [file("speed.png", "image/png")] },
    });
    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem(draftKey) || "{}").data?.values?.password).toBeUndefined();
      expect(JSON.parse(localStorage.getItem(persistentDraftKey) || "{}").data?.values?.password).toBeUndefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التسجيل" }));

    await waitFor(() => expect(mocks.registerTeacher).toHaveBeenCalledTimes(1));
    const body = mocks.registerTeacher.mock.calls[0][0] as FormData;
    expect(body.has("password")).toBe(true);
    expect(body.get("password")).toBe(password);
  });

  it("reports a network error", async () => {
    mocks.registerTeacher.mockRejectedValueOnce(apiFailure("NETWORK_ERROR", "network failed"));
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);
    await reachFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التسجيل" }));
    await waitFor(() => expect(mocks.reportClientError).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "NETWORK_ERROR", name: "Teacher Name", email: "teacher@example.com",
    })));
  });

  it("reports a timeout distinctly", async () => {
    mocks.registerTeacher.mockRejectedValueOnce(apiFailure("NETWORK_ERROR", "timeout", { axiosCode: "ECONNABORTED" }));
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);
    await reachFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التسجيل" }));
    await waitFor(() => expect(mocks.reportClientError).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "TIMEOUT" })));
  });

  it("does not report ordinary local validation errors", () => {
    sessionStorage.clear();
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    expect(mocks.reportClientError).not.toHaveBeenCalled();
  });

  it("keeps the existing failure flow when reporting itself fails", async () => {
    mocks.registerTeacher.mockRejectedValueOnce(apiFailure("NETWORK_ERROR", "network failed"));
    mocks.reportClientError.mockRejectedValueOnce(new Error("report endpoint unavailable"));
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);
    await reachFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التسجيل" }));
    expect(await screen.findByText("حدثت مشكلة مؤقتة في الاتصال، برجاء المحاولة مرة أخرى.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إرسال طلب التسجيل" })).toBeEnabled();
  });

  it("never passes passwords or secret fields to the reporter", async () => {
    mocks.registerTeacher.mockRejectedValueOnce(apiFailure("NETWORK_ERROR", `password=${password} token=secret-token`));
    render(<MemoryRouter><TeacherSignup /></MemoryRouter>);
    await reachFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب التسجيل" }));
    await waitFor(() => expect(mocks.reportClientError).toHaveBeenCalled());
    const report = mocks.reportClientError.mock.calls[0][0];
    expect(JSON.stringify(report)).not.toContain(password);
    expect(JSON.stringify(report)).not.toContain("secret-token");
    expect(report).not.toHaveProperty("password");
    expect(report).not.toHaveProperty("token");
    expect(report).not.toHaveProperty("formData");
    expect(report.name).toBe("Teacher Name");
  });
});
