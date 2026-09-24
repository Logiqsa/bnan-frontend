import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminGuard from "./AdminGuard";
import { usePortalAuth } from "@/portal/PortalAuthContext";

vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: vi.fn() }));

const renderGuard = () => render(<MemoryRouter initialEntries={["/admin/payroll"]}><Routes>
  <Route path="/admin/payroll" element={<AdminGuard><div>protected payroll</div></AdminGuard>} />
  <Route path="/portal/teacher" element={<div>teacher home</div>} />
</Routes></MemoryRouter>);

describe("AdminGuard payroll protection", () => {
  it("allows an admin", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "1", role: "admin" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderGuard();
    expect(screen.getByText("protected payroll")).toBeInTheDocument();
  });

  it("redirects a teacher away from admin payroll", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "2", role: "teacher" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderGuard();
    expect(screen.getByText("teacher home")).toBeInTheDocument();
  });
});
