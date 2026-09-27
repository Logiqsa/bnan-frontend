import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { GlobalRuntimeErrorBoundary } from "./GlobalRuntimeErrorBoundary";

const ThrowingChild = ({ message = "Cannot read properties of undefined (reading 'length')" }: { message?: string }) => {
  throw new Error(message);
};

describe("GlobalRuntimeErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the actual render error and its technical details", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GlobalRuntimeErrorBoundary><ThrowingChild /></GlobalRuntimeErrorBoundary>);

    expect(screen.getByRole("heading", { name: "حدث خطأ غير متوقع" })).toBeInTheDocument();
    expect(screen.getByTestId("runtime-error-message")).toHaveTextContent("Cannot read properties of undefined (reading 'length')");
    expect(screen.getByText("التفاصيل التقنية")).toBeInTheDocument();
    expect(screen.getByTestId("runtime-error-details")).toHaveTextContent("Stack:");
    expect(screen.getByTestId("runtime-error-component")).toHaveTextContent("ThrowingChild");
  });

  it("reloads through the supplied reload action", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onReload = vi.fn();

    render(<GlobalRuntimeErrorBoundary onReload={onReload}><ThrowingChild /></GlobalRuntimeErrorBoundary>);
    fireEvent.click(screen.getByRole("button", { name: "إعادة تحميل الصفحة" }));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it("redacts sensitive values from the visible diagnostics", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GlobalRuntimeErrorBoundary><ThrowingChild message="Authorization: Bearer super-secret-token password=plain-text" /></GlobalRuntimeErrorBoundary>);

    expect(screen.getByTestId("runtime-error-message")).not.toHaveTextContent("super-secret-token");
    expect(screen.getByTestId("runtime-error-message")).not.toHaveTextContent("plain-text");
    expect(screen.getByTestId("runtime-error-message")).toHaveTextContent("[REDACTED]");
  });

  it("keeps normal routes rendering when no runtime error occurs", () => {
    render(
      <GlobalRuntimeErrorBoundary>
        <MemoryRouter initialEntries={["/working"]}>
          <Routes><Route path="/working" element={<main>صفحة سليمة</main>} /></Routes>
        </MemoryRouter>
      </GlobalRuntimeErrorBoundary>,
    );

    expect(screen.getByText("صفحة سليمة")).toBeInTheDocument();
    expect(screen.queryByText("حدث خطأ غير متوقع")).not.toBeInTheDocument();
  });

  it("does not replace expected API rejections with the runtime error screen", () => {
    render(<GlobalRuntimeErrorBoundary><main>واجهة عادية</main></GlobalRuntimeErrorBoundary>);
    const event = new Event("unhandledrejection");
    Object.defineProperty(event, "reason", { value: new ApiError(403, "FORBIDDEN", "غير مسموح"), configurable: true });

    window.dispatchEvent(event);

    expect(screen.getByText("واجهة عادية")).toBeInTheDocument();
    expect(screen.queryByText("حدث خطأ غير متوقع")).not.toBeInTheDocument();
  });
});
