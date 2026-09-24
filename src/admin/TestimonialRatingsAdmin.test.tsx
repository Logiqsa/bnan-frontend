import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TestimonialRatingsAdmin from "./TestimonialRatingsAdmin";

const mocks = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), unapprove: vi.fn() }));
vi.mock("@/api/testimonialApi", () => ({ testimonialApi: { admin: mocks } }));
vi.mock("./LegacyVisibilityToggle", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clientResponse = (data: Array<Record<string, unknown>>, page = 1, hasNextPage = false) => ({ success: true, data, page, limit: 50, total: data.length, hasNextPage });
const renderPage = () => render(<TestimonialRatingsAdmin />);

describe("TestimonialRatingsAdmin", () => {
  it("renders loading, list content, and moderation actions without delete", async () => {
    mocks.list.mockResolvedValue(clientResponse([{ id: "pending-1", full_name: "عميل", message: "رائع", rating: 5, approved: false, created_at: "2026-09-01" }]));
    renderPage();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    expect(await screen.findByText("عميل")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اعتماد" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /حذف/ })).not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith("all", 1);
  });

  it("shows unapprove for approved testimonials and calls the existing endpoint", async () => {
    mocks.list.mockResolvedValue(clientResponse([{ id: "approved-1", full_name: "عميل معتمد", message: "ممتاز", rating: 4, approved: true, created_at: "2026-09-01" }]));
    mocks.unapprove.mockResolvedValue({});
    renderPage();
    expect(await screen.findByText("عميل معتمد")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إلغاء الاعتماد" }));
    await waitFor(() => expect(mocks.unapprove).toHaveBeenCalledWith("approved-1"));
  });

  it("approves pending testimonials through the existing endpoint", async () => {
    mocks.list.mockResolvedValue(clientResponse([{ id: "pending-2", full_name: "عميل جديد", message: "جيد", rating: 3, approved: false, created_at: "2026-09-01" }]));
    mocks.approve.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "اعتماد" }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith("pending-2"));
  });

  it("supports empty, error retry, and server pagination", async () => {
    mocks.list.mockResolvedValueOnce(clientResponse([], 1, false)).mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(clientResponse([{ id: "next-1", full_name: "صفحة ثانية", message: "جيد", rating: 5, approved: true, created_at: "2026-09-01" }], 2, false));
    renderPage();
    expect(await screen.findByText("لا توجد تقييمات")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "معتمد" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("صفحة ثانية")).toBeInTheDocument();
  });

  it("moves to the next server page without making a delete request", async () => {
    mocks.list.mockResolvedValueOnce(clientResponse([{ id: "page-1", full_name: "صفحة أولى", message: "جيد", rating: 5, approved: true, created_at: "2026-09-01" }], 1, true)).mockResolvedValueOnce(clientResponse([{ id: "page-2", full_name: "صفحة ثانية", message: "جيد", rating: 5, approved: true, created_at: "2026-09-01" }], 2, false));
    renderPage();
    expect(await screen.findByText("صفحة أولى")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(await screen.findByText("صفحة ثانية")).toBeInTheDocument();
    expect(mocks).not.toHaveProperty("delete");
  });
});
