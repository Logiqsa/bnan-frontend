import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentSessions from "./StudentSessions";

const mocks = vi.hoisted(() => ({ regular: vi.fn(), courses: vi.fn(), recordings: vi.fn() }));
vi.mock("@/api/studentClassroomsApi", () => ({ studentClassroomsApi: { myEnrollments: mocks.regular } }));
vi.mock("@/api/coursesApi", () => ({ coursesApi: { myEnrollments: mocks.courses } }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: { listRecordings: mocks.recordings } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentSessions /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentSessions", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.regular.mockReset(); mocks.courses.mockReset(); mocks.recordings.mockReset();
    mocks.courses.mockResolvedValue([]);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  });

  it("gets approved classroom IDs from the Student enrollment source and calls each recording endpoint", async () => {
    mocks.regular.mockResolvedValue([
      { id: "e1", status: "approved", classroom: { id: "c1", name: "الأول" } },
      { id: "e2", status: "approved", classroom: { id: "c2", name: "الثاني" } },
      { id: "e3", status: "rejected", classroom: { id: "c3", name: "مرفوض" } },
    ]);
    mocks.recordings.mockResolvedValue({ success: true, data: [] });
    renderPage();
    await waitFor(() => expect(mocks.recordings).toHaveBeenCalledTimes(2));
    expect(mocks.recordings).toHaveBeenCalledWith("c1");
    expect(mocks.recordings).toHaveBeenCalledWith("c2");
    expect(mocks.recordings).not.toHaveBeenCalledWith("c3");
  });

  it("includes only active Course classroom IDs and preserves their source name", async () => {
    mocks.regular.mockResolvedValue([]);
    mocks.courses.mockResolvedValue([{ id: "course-e1", status: "active", classroom: { id: "course-c1", name: "فصل الدورة" } }, { id: "course-e2", status: "completed", classroom: { id: "course-c2", name: "قديم" } }]);
    mocks.recordings.mockResolvedValue({ success: true, data: [{ sessionName: "الحصة الأولى", recordingLink: "/uploads/record.mp4", localUrl: "/uploads/record.mp4", shareUrl: null }] });
    renderPage();
    expect(await screen.findByText("فصل الدورة")).toBeInTheDocument();
    expect(mocks.recordings).toHaveBeenCalledWith("course-c1");
    expect(mocks.recordings).not.toHaveBeenCalledWith("course-c2");
  });

  it("uses recordingLink in the existing player and shows no fabricated metadata", async () => {
    mocks.regular.mockResolvedValue([{ id: "e1", status: "approved", classroom: { id: "c1", name: "الفصل" } }]);
    mocks.recordings.mockResolvedValue({ success: true, data: [{ sessionName: "مراجعة العلوم", recordingLink: "/uploads/record.mp4", localUrl: "/uploads/record.mp4", shareUrl: "https://zoom.example/share" }] });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "مشاهدة التسجيل" }));
    const dialog = screen.getByRole("dialog", { name: /تشغيل مراجعة العلوم/ });
    expect(within(dialog).getByText("مراجعة العلوم")).toBeInTheDocument();
    expect(dialog.querySelector("video")).toHaveAttribute("src", "/uploads/record.mp4");
    expect(screen.queryByText(/التاريخ|المدة|session/i)).not.toBeInTheDocument();
  });

  it("does not treat a missing recordingLink as playable", async () => {
    mocks.regular.mockResolvedValue([{ id: "e1", status: "approved", classroom: { id: "c1", name: "الفصل" } }]);
    mocks.recordings.mockResolvedValue({ success: true, data: [{ sessionName: "غير جاهز", recordingLink: "", localUrl: null, shareUrl: null }] });
    renderPage();
    expect(await screen.findByText("التسجيل غير متاح للتشغيل.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "مشاهدة التسجيل" })).not.toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mocks.regular.mockResolvedValue([{ id: "e1", status: "approved", classroom: { id: "c1", name: "الفصل" } }]);
    mocks.recordings.mockResolvedValue({ success: true, data: [] });
    renderPage();
    expect(await screen.findByText("لا توجد تسجيلات جاهزة حتى الآن.")).toBeInTheDocument();
  });

  it("keeps successful classroom recordings visible on a partial failure", async () => {
    mocks.regular.mockResolvedValue([{ id: "e1", status: "approved", classroom: { id: "c1", name: "الأول" } }, { id: "e2", status: "approved", classroom: { id: "c2", name: "الثاني" } }]);
    mocks.recordings.mockImplementation((id: string) => id === "c1" ? Promise.resolve({ success: true, data: [{ sessionName: "تسجيل متاح", recordingLink: "/record.mp4", localUrl: "/record.mp4", shareUrl: null }] }) : Promise.reject(new Error("failed")));
    renderPage();
    expect(await screen.findByText("تسجيل متاح")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("تعذر تحميل تسجيلات بعض الفصول");
  });

  it("shows an error when all classroom recording requests fail", async () => {
    mocks.regular.mockResolvedValue([{ id: "e1", status: "approved", classroom: { id: "c1", name: "الفصل" } }]);
    mocks.recordings.mockRejectedValue(new Error("failed"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل التسجيلات.");
  });
});
