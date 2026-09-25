import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CourseRegistrationDialog from "./CourseRegistrationDialog";

const mocks = vi.hoisted(() => ({
  enrollFree: vi.fn(),
  checkout: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  saveCourseEnrollment: vi.fn(),
}));

vi.mock("@/api/coursesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/coursesApi")>()),
  coursesApi: { enrollFree: mocks.enrollFree, checkout: mocks.checkout },
}));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { id: "student-1", role: "student" } }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/tamaraDraft", () => ({ gulfPaymentDraftStore: { saveCourseEnrollment: mocks.saveCourseEnrollment } }));

const course = {
  id: "course-1",
  name: "الدورة الجديدة",
  description: "الوصف",
  teacher: "teacher-1",
  eligibleGrades: [],
  currency: "EGP",
  enrollmentModes: {
    group: { enabled: true, price: 0 },
    individual: { enabled: true, price: 0 },
  },
  enrollmentOpen: true,
  status: "active" as const,
};

const renderDialog = () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return {
    invalidate,
    ...render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={course} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>),
  };
};

describe("CourseRegistrationDialog free re-enrollment", () => {
  beforeEach(() => {
    mocks.enrollFree.mockReset().mockResolvedValue({ id: "new-enrollment", status: "active" });
    mocks.checkout.mockReset();
    mocks.navigate.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
    mocks.saveCourseEnrollment.mockReset();
  });

  it("creates a paid checkout with the selected mode and saves its draft", async () => {
    const paidCourse = {
      ...course,
      enrollmentModes: {
        group: { enabled: true, price: 500 },
        individual: { enabled: true, price: 900 },
      },
    };
    mocks.checkout.mockResolvedValue({ data: { paymentId: "payment-1", checkoutUrl: "https://pay.test/course", status: "pending" } });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole("radio", { name: /فردي/ }));
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    expect(mocks.checkout.mock.calls[0][0]).toMatchObject({ courseId: "course-1", mode: "individual", provider: "paymob" });
    expect(mocks.checkout.mock.calls[0][0]).not.toHaveProperty("paymentAddress");
    expect(mocks.saveCourseEnrollment).toHaveBeenCalledWith({ paymentId: "payment-1", provider: "paymob", checkoutUrl: "https://pay.test/course", courseId: "course-1", mode: "individual", createdAt: expect.any(Number) });
  });

  it("reuses one idempotency key for retries and prevents simultaneous paid submits", async () => {
    const paidCourse = { ...course, enrollmentModes: { group: { enabled: true, price: 500 }, individual: { enabled: false, price: 0 } } };
    mocks.checkout.mockReturnValue(new Promise(() => undefined));
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    const submit = screen.getByRole("button", { name: "الانتقال للدفع" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    expect(mocks.checkout.mock.calls[0][1]).toEqual(expect.any(String));
  });

  it("reuses the paid attempt idempotency key after an API failure", async () => {
    const paidCourse = { ...course, enrollmentModes: { group: { enabled: true, price: 500 }, individual: { enabled: false, price: 0 } } };
    mocks.checkout.mockRejectedValue(new Error("unavailable"));
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledTimes(2));
    expect(mocks.checkout.mock.calls[0][1]).toBe(mocks.checkout.mock.calls[1][1]);
  });

  it("requires a Tamara address but does not require one for Paymob", async () => {
    const paidCourse = { ...course, enrollmentModes: { group: { enabled: true, price: 500 }, individual: { enabled: false, price: 0 } } };
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: /تمارا/ }));
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("أدخل عنوان الدفع المطلوب لـ Tamara.");
  });

  it("sends the required payment address for Tamara", async () => {
    const paidCourse = { ...course, enrollmentModes: { group: { enabled: true, price: 500 }, individual: { enabled: false, price: 0 } } };
    mocks.checkout.mockResolvedValue({ data: { paymentId: "payment-tamara", checkoutUrl: "https://pay.test/tamara", status: "pending" } });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: /تمارا/ }));
    fireEvent.change(screen.getByPlaceholderText("المدينة"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByPlaceholderText("المنطقة"), { target: { value: "الرياض" } });
    fireEvent.change(screen.getByPlaceholderText("العنوان"), { target: { value: "شارع الملك" } });
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ provider: "tamara", paymentAddress: { city: "الرياض", region: "الرياض", line1: "شارع الملك" } }), expect.any(String)));
  });

  it("does not save a draft when checkout identifiers are incomplete", async () => {
    const paidCourse = { ...course, enrollmentModes: { group: { enabled: true, price: 500 }, individual: { enabled: false, price: 0 } } };
    mocks.checkout.mockResolvedValue({ data: { paymentId: "", checkoutUrl: "", status: "pending" } });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><CourseRegistrationDialog course={paidCourse} onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "الانتقال للدفع" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.saveCourseEnrollment).not.toHaveBeenCalled();
  });

  it("does not reuse the previous round mode and submits the newly selected mode", async () => {
    const { invalidate } = renderDialog();
    const group = screen.getByRole("radio", { name: /جماعي/ });
    const individual = screen.getByRole("radio", { name: /فردي/ });
    expect(group).toBeChecked();
    expect(individual).not.toBeChecked();
    fireEvent.click(individual);
    fireEvent.click(screen.getByRole("button", { name: "تفعيل التسجيل" }));
    await waitFor(() => expect(mocks.enrollFree).toHaveBeenCalledWith("course-1", "individual"));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["my-course-enrollments"] });
    expect(mocks.success).toHaveBeenCalledWith("تم تفعيل تسجيلك في الدورة");
    expect(mocks.navigate).toHaveBeenCalledWith("/portal/student/courses");
  });

  it("prevents duplicate free enrollment submissions", async () => {
    mocks.enrollFree.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    const submit = screen.getByRole("button", { name: "تفعيل التسجيل" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.enrollFree).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
  });
});
