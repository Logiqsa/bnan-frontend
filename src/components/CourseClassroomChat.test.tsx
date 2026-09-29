import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CourseClassroomChat from "./CourseClassroomChat";
import { ApiError } from "@/api/client";

const mocks = vi.hoisted(() => ({
  activeSession: vi.fn(),
  startSession: vi.fn(),
  joinSession: vi.fn(),
  endSession: vi.fn(),
  rooms: vi.fn(),
  messages: vi.fn(),
  send: vi.fn(),
  deleteMessage: vi.fn(),
  user: { id: "teacher-user", role: "teacher" },
}));

vi.mock("@/portal/PortalAuthContext", () => ({
  usePortalAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/api/scheduleApi", () => ({
  getActiveClassroomSession: mocks.activeSession,
  startClassroomSession: mocks.startSession,
  joinLesson: mocks.joinSession,
  endSession: mocks.endSession,
}));
vi.mock("@/api/chatApi", () => ({
  chatApi: {
    rooms: mocks.rooms,
    adminRooms: mocks.rooms,
    messages: mocks.messages,
    send: mocks.send,
    deleteMessage: mocks.deleteMessage,
  },
}));
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}));
vi.mock("@/lib/courseUi", () => ({ courseError: () => "حدث خطأ" }));

const scheduled = {
  sessionId: null,
  status: "scheduled" as const,
  classroomSubjectId: "assignment-1",
  subjectId: "subject-1",
  scheduledStartAt: "2026-09-29T10:00:00.000Z",
  scheduledEndAt: "2026-09-29T11:00:00.000Z",
  startStatus: "AVAILABLE" as const,
  canStart: true,
};
const live = {
  sessionId: "session-1",
  status: "live" as const,
  canJoin: true,
  startAt: new Date(Date.now() - 12_000).toISOString(),
};

const renderChat = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CourseClassroomChat classroomId="classroom-1" />
    </QueryClientProvider>,
  );
};

describe("CourseClassroomChat session controls", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("open", vi.fn());
    mocks.user = { id: "teacher-user", role: "teacher" };
    mocks.rooms.mockReset();
    mocks.messages.mockReset();
    mocks.activeSession.mockReset();
    mocks.startSession.mockReset();
    mocks.joinSession.mockReset();
    mocks.endSession.mockReset();
    mocks.send.mockReset();
    mocks.deleteMessage.mockReset();
    mocks.rooms.mockResolvedValue([{ id: "room-1", classroomId: "classroom-1", displayName: "محادثة الفصل" }]);
    mocks.messages.mockResolvedValue({ success: true, data: [], pagination: { hasMore: false } });
  });

  it("shows the teacher start action only when the backend marks the window available", async () => {
    mocks.activeSession.mockResolvedValue({ ...scheduled, canStart: false, startStatus: "NOT_OPEN" });
    renderChat();

    expect(await screen.findByText("لم يحن موعد بدء الحصة بعد")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ابدأ الحصة" })).not.toBeInTheDocument();
  });

  it("starts once and replaces the start action with the backend-timestamp live counter", async () => {
    let current: typeof scheduled | typeof live = scheduled;
    mocks.activeSession.mockImplementation(() => Promise.resolve(current));
    mocks.startSession.mockImplementation(async () => {
      current = live;
      return { success: true, data: { session: { _id: "session-1" }, meetingLink: "https://zoom.example/join" } };
    });
    renderChat();

    const start = await screen.findByRole("button", { name: "ابدأ الحصة" });
    fireEvent.click(start);
    fireEvent.click(start);

    await waitFor(() => expect(mocks.startSession).toHaveBeenCalledTimes(1));
    expect(mocks.startSession).toHaveBeenCalledWith("classroom-1", expect.objectContaining({ classroomSubjectId: "assignment-1" }));
    expect(await screen.findByText(/مدة الحصة/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ابدأ الحصة" })).not.toBeInTheDocument();
    expect(window.open).toHaveBeenCalledWith("https://zoom.example/join", "_blank", "noopener,noreferrer");
  });

  it("refreshes the backend session state after a start-window conflict", async () => {
    let current: Record<string, unknown> = scheduled;
    mocks.activeSession.mockImplementation(() => Promise.resolve(current));
    mocks.startSession.mockImplementation(async () => {
      current = { ...scheduled, canStart: false, startStatus: "CLOSED" };
      throw new ApiError(409, "START_WINDOW_CLOSED", "انتهت نافذة البدء");
    });
    renderChat();

    fireEvent.click(await screen.findByRole("button", { name: "ابدأ الحصة" }));

    await waitFor(() => expect(mocks.startSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.activeSession.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByRole("button", { name: "ابدأ الحصة" })).not.toBeInTheDocument();
  });

  it("lets a student join only a backend-confirmed live session", async () => {
    mocks.user = { id: "student-user", role: "student" };
    mocks.activeSession.mockResolvedValue(live);
    mocks.joinSession.mockResolvedValue({ success: true, data: { meetingLink: "https://zoom.example/join" } });
    renderChat();

    fireEvent.click(await screen.findByRole("button", { name: "دخول الحصة" }));

    await waitFor(() => expect(mocks.joinSession).toHaveBeenCalledWith("classroom-1"));
    expect(window.open).toHaveBeenCalledWith("https://zoom.example/join", "_blank", "noopener,noreferrer");
  });

  it("does not show student join for a non-live session", async () => {
    mocks.user = { id: "student-user", role: "student" };
    mocks.activeSession.mockResolvedValue({ ...scheduled, canStart: false, startStatus: "NOT_OPEN" });
    renderChat();

    await screen.findByText("محادثة الفصل");
    expect(screen.queryByRole("button", { name: "دخول الحصة" })).not.toBeInTheDocument();
  });

  it("refreshes and removes student join after SESSION_NOT_ACTIVE", async () => {
    mocks.user = { id: "student-user", role: "student" };
    let current: Record<string, unknown> = live;
    mocks.activeSession.mockImplementation(() => Promise.resolve(current));
    mocks.joinSession.mockImplementation(async () => {
      current = { ...scheduled, canStart: false, startStatus: "CLOSED" };
      throw new ApiError(404, "SESSION_NOT_ACTIVE", "لا توجد حصة مباشرة");
    });
    renderChat();

    fireEvent.click(await screen.findByRole("button", { name: "دخول الحصة" }));

    await waitFor(() => expect(mocks.joinSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "دخول الحصة" })).not.toBeInTheDocument());
  });

  it("requests ending a live teacher session once and shows the waiting state", async () => {
    let current: Record<string, unknown> = live;
    mocks.activeSession.mockImplementation(() => Promise.resolve(current));
    mocks.endSession.mockImplementation(async () => {
      current = { ...live, status: "awaiting_zoom_end" };
      return { id: "session-1", status: "awaiting_zoom_end" };
    });
    renderChat();

    expect(await screen.findByText(/مدة الحصة/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "إنهاء الحصة" }));
    fireEvent.click(screen.getByRole("button", { name: /جاري الإنهاء|إنهاء الحصة/ }));

    await waitFor(() => expect(mocks.endSession).toHaveBeenCalledWith("session-1"));
    expect(mocks.endSession).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("في انتظار تأكيد إنهاء الحصة...")).toBeInTheDocument();
  });
});
