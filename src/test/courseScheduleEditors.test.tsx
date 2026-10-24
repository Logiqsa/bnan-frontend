import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherEditor from "@/portal/CourseClassroomSchedule";
import AdminEditor from "@/admin/CourseClassroomScheduleAdmin";

const mocks = vi.hoisted(() => ({
  getSchedule: vi.fn(), updateSchedule: vi.fn(), listGroups: vi.fn(),
  getClassroom: vi.fn(), getAvailability: vi.fn(), generateMeeting: vi.fn(),
  getClassroomWeeklyAssignments: vi.fn(),
  retryClassroomWeeklyAssignments: vi.fn(),
  toastSuccess: vi.fn(), toastError: vi.fn(), role: "teacher",
}));

vi.mock("@/api/coursesApi", () => ({ coursesApi: {
  getSchedule: mocks.getSchedule, updateSchedule: mocks.updateSchedule, listGroups: mocks.listGroups,
} }));
vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: {
  getClassroom: mocks.getClassroom, getAvailability: mocks.getAvailability, generateMeeting: mocks.generateMeeting,
} }));
vi.mock("@/api/zoomAccountsApi", () => ({ zoomAccountsApi: {
  getClassroomWeeklyAssignments: mocks.getClassroomWeeklyAssignments,
  retryClassroomWeeklyAssignments: mocks.retryClassroomWeeklyAssignments,
} }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useParams: () => ({ classroomId: "room-1" }),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange?: (value: string) => void; disabled?: boolean; children: ReactNode }) =>
    <select aria-label="اليوم" value={value} disabled={disabled} onChange={(event) => onValueChange?.(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));
vi.mock("@/components/Time12Input", () => ({ default: ({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) =>
  <input aria-label="وقت" type="time" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />,
}));

const identified = (id: string, day: "saturday" | "sunday" | "monday" | "tuesday" = "saturday", startTime = "10:00") =>
  ({ slotId: id, day, startTime, endTime: "11:00" });
const firstId = "csl_aaaaaaaaaaaaaaaaaaaaaa";
const secondId = "csl_bbbbbbbbbbbbbbbbbbbbbb";
const schedule = (slots = [identified(firstId)]) => ({ id: "schedule-1", timezone: "Africa/Cairo", slots });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };

const renderTeacher = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><TeacherEditor /></QueryClientProvider>);
};
const zoomDefaults = () => {
  mocks.getClassroom.mockResolvedValue({ success: true, data: { id: "room-1", name: "Course room" } });
  mocks.getAvailability.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", accounts: [] } });
  mocks.listGroups.mockResolvedValue([]);
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSchedule.mockReset(); mocks.updateSchedule.mockReset(); mocks.listGroups.mockReset();
  mocks.getClassroom.mockReset(); mocks.getAvailability.mockReset(); mocks.generateMeeting.mockReset();
  mocks.role = "teacher"; zoomDefaults();
  mocks.getClassroomWeeklyAssignments.mockResolvedValue({ data: { classroom: { id: "room-1", name: "Course room" }, slots: [] } });
  mocks.retryClassroomWeeklyAssignments.mockResolvedValue({ data: { attemptedCount: 0, readyCount: 0, unresolvedCount: 0, results: [] } });
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "client-key-new") });
});

describe("teacher course schedule editor", () => {
  it("hydrates a new server ID, preserves edits and deletion, and never submits client keys", async () => {
    const authoritative = schedule([identified(firstId, "monday", "10:30"), identified(secondId, "sunday", "18:00")]);
    const afterDelete = schedule([identified(secondId, "tuesday", "18:30")]);
    mocks.getSchedule
      .mockResolvedValueOnce(schedule())
      .mockResolvedValueOnce(authoritative)
      .mockResolvedValueOnce(authoritative)
      .mockResolvedValueOnce(afterDelete)
      .mockResolvedValueOnce(afterDelete);
    mocks.updateSchedule.mockResolvedValue(schedule()).mockResolvedValue(afterDelete);
    renderTeacher();
    expect(await screen.findByDisplayValue("10:00")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("10:00"), { target: { value: "10:30" } });
    fireEvent.change(screen.getAllByLabelText("اليوم")[0], { target: { value: "monday" } });
    fireEvent.click(screen.getByRole("button", { name: "موعد" }));
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(1));
    const firstPayload = mocks.updateSchedule.mock.calls[0][1];
    expect(firstPayload.slots[0]).toMatchObject({ slotId: firstId, day: "monday", startTime: "10:30" });
    expect(firstPayload.slots[1]).not.toHaveProperty("slotId");
    expect(JSON.stringify(firstPayload)).not.toContain("clientKey");
    await waitFor(() => expect(screen.getByDisplayValue("18:00")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("18:00"), { target: { value: "18:30" } });
    fireEvent.change(screen.getAllByLabelText("اليوم")[1], { target: { value: "tuesday" } });
    const rows = screen.getAllByLabelText("وقت البداية").map((input) => input.closest("div")!);
    fireEvent.click(within(rows[0]).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(2));
    expect(mocks.updateSchedule.mock.calls[1][1].slots).toEqual([identified(secondId, "tuesday", "18:30")]);
  });

  it("keeps controls locked during a delayed authoritative GET", async () => {
    const late = deferred<ReturnType<typeof schedule>>();
    mocks.getSchedule.mockResolvedValueOnce(schedule()).mockReturnValueOnce(late.promise).mockResolvedValue(schedule());
    mocks.updateSchedule.mockResolvedValue(schedule());
    renderTeacher();
    const start = await screen.findByDisplayValue("10:00");
    fireEvent.change(start, { target: { value: "10:30" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.getSchedule).toHaveBeenCalledTimes(2));
    const locked = screen.getByDisplayValue("10:30") as HTMLInputElement;
    expect(locked).toBeDisabled();
    // Force the otherwise-disabled control to model a late queued edit and exercise the revision guard.
    locked.disabled = false;
    fireEvent.change(locked, { target: { value: "10:45" } });
    late.resolve(schedule([identified(firstId, "monday", "10:30")]));
    await waitFor(() => expect(screen.getByDisplayValue("10:45")).not.toBeDisabled());
  });

  it("renders legacy slots read-only and preserves unsaved input on a concurrent error", async () => {
    mocks.getSchedule.mockResolvedValueOnce({ timezone: "Africa/Cairo", slots: [{ day: "saturday", startTime: "08:00" }] });
    const view = renderTeacher();
    expect(await screen.findByText(/هذا جدول قديم متاح للعرض فقط/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "حفظ الجدول" })).not.toBeInTheDocument();
    view.unmount();

    mocks.getSchedule.mockReset().mockResolvedValueOnce(schedule()).mockResolvedValueOnce(schedule([identified(firstId, "tuesday", "12:00")]));
    mocks.updateSchedule.mockRejectedValue({ code: "COURSE_SCHEDULE_CONCURRENT_UPDATE", message: "raw" });
    renderTeacher();
    const start = await screen.findByDisplayValue("10:00");
    fireEvent.change(start, { target: { value: "10:45" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    expect(await screen.findByText(/دون حذف تعديلاتك الحالية/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("10:45")).toBeInTheDocument();
  });
});

describe("admin and supervisor course schedule editor", () => {
  it("retries Zoom preparation when the admin refresh button is pressed", async () => {
    mocks.role = "admin";
    mocks.getSchedule.mockResolvedValue(schedule());
    mocks.getClassroomWeeklyAssignments.mockResolvedValue({ data: {
      classroom: { id: "room-1", name: "Course room" },
      slots: [{ assignmentId: "assignment-1", weeklySlotKey: "zws_test", slotId: firstId, day: "saturday", startTime: "10:00", endTime: "11:00", timezone: "Africa/Cairo", status: "quarantined", state: "quarantined", cutoverState: "active", assignmentVersion: 0, account: { id: "zoom-1", name: "Zoom Arabic 1", hostFingerprint: "fingerprint" }, meeting: null, reason: "WEEKLY_ZOOM_PROVIDER_OUTCOME_UNKNOWN" }],
    } });
    mocks.retryClassroomWeeklyAssignments.mockResolvedValue({ data: { attemptedCount: 1, readyCount: 1, unresolvedCount: 0, results: [{ assignmentId: "assignment-1", status: "ready", reason: "reconciled" }] } });
    render(<AdminEditor />);
    fireEvent.click(await screen.findByRole("button", { name: "تحديث وتجهيز Zoom" }));
    await waitFor(() => expect(mocks.retryClassroomWeeklyAssignments).toHaveBeenCalledWith("room-1"));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("تم تجهيز 1 موعد Zoom بنجاح."));
  });

  it("shows the ready per-slot participant link and creating account to an admin", async () => {
    mocks.role = "admin";
    mocks.getSchedule.mockResolvedValue(schedule());
    mocks.getClassroomWeeklyAssignments.mockResolvedValue({ data: {
      classroom: { id: "room-1", name: "Course room" },
      slots: [{ assignmentId: "assignment-1", weeklySlotKey: "zws_test", slotId: firstId, day: "saturday", startTime: "10:00", endTime: "11:00", timezone: "Africa/Cairo", status: "ready", state: "ready", cutoverState: "active", assignmentVersion: 0, account: { id: "zoom-1", name: "Zoom Arabic 1", hostFingerprint: "fingerprint" }, meeting: { id: "meeting-1", participantUrl: "https://zoom.example/j/meeting-1", type: 3 }, reason: null }],
    } });
    render(<AdminEditor />);
    expect(await screen.findByText(/الحساب: Zoom Arabic 1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://zoom.example/j/meeting-1" })).toBeInTheDocument();
  });

  it("hydrates a new ID and includes it in the second save without UI keys", async () => {
    const authoritative = schedule([identified(firstId), identified(secondId, "saturday", "09:00")]);
    const final = schedule([identified(secondId, "monday", "09:30")]);
    mocks.getSchedule.mockResolvedValueOnce(schedule()).mockResolvedValueOnce(authoritative).mockResolvedValueOnce(final);
    mocks.updateSchedule.mockResolvedValue(schedule()).mockResolvedValue(final);
    render(<AdminEditor />);
    expect(await screen.findByText("المواعيد الأسبوعية")).toBeInTheDocument();
    expect(screen.getByText("تجهيز Zoom تلقائيًا")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ربط وإنشاء الرابط/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إضافة موعد" }));
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(1));
    expect(mocks.updateSchedule.mock.calls[0][1].slots[1]).not.toHaveProperty("slotId");
    expect(JSON.stringify(mocks.updateSchedule.mock.calls[0][1])).not.toContain("clientKey");
    await waitFor(() => expect(screen.getByDisplayValue("09:00")).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue("09:00"), { target: { value: "09:30" } });
    fireEvent.change(screen.getAllByLabelText("اليوم")[1], { target: { value: "monday" } });
    fireEvent.click(document.querySelector(".lucide-trash2")!.closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(2));
    expect(mocks.updateSchedule.mock.calls[1][1].slots).toEqual([identified(secondId, "monday", "09:30")]);
  });

  it("locks a delayed save/refetch and keeps concurrent unsaved input", async () => {
    const late = deferred<ReturnType<typeof schedule>>();
    mocks.getSchedule.mockResolvedValueOnce(schedule()).mockReturnValueOnce(late.promise);
    mocks.updateSchedule.mockResolvedValue(schedule());
    const view = render(<AdminEditor />);
    await screen.findByText("المواعيد الأسبوعية");
    fireEvent.change(screen.getByDisplayValue("10:00"), { target: { value: "10:30" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    await waitFor(() => expect(mocks.getSchedule).toHaveBeenCalledTimes(2));
    const locked = screen.getByDisplayValue("10:30") as HTMLInputElement;
    expect(locked).toBeDisabled();
    locked.disabled = false;
    fireEvent.change(locked, { target: { value: "10:45" } });
    late.resolve(schedule([identified(firstId, "monday", "10:30")]));
    await waitFor(() => expect(screen.getByDisplayValue("10:45")).not.toBeDisabled());
    view.unmount();

    mocks.getSchedule.mockReset().mockResolvedValueOnce(schedule()).mockResolvedValueOnce(schedule([identified(firstId, "tuesday", "12:00")]));
    mocks.updateSchedule.mockRejectedValue({ code: "COURSE_SCHEDULE_CONCURRENT_UPDATE", message: "raw" });
    render(<AdminEditor />);
    await screen.findByText("المواعيد الأسبوعية");
    fireEvent.change(screen.getByDisplayValue("10:00"), { target: { value: "10:45" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الجدول" }));
    expect(await screen.findByText(/دون حذف تعديلاتك الحالية/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("10:45")).toBeInTheDocument();
  });

  it("shows legacy schedules as disabled for admin and supervisor", async () => {
    mocks.role = "supervisor";
    mocks.getSchedule.mockResolvedValue({ timezone: "Africa/Cairo", slots: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] });
    render(<AdminEditor />);
    expect(await screen.findByText(/هذا جدول قديم متاح للعرض فقط/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeDisabled();
    expect(screen.getByRole("button", { name: "حفظ الجدول" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إضافة موعد" })).toBeDisabled();
  });
});
