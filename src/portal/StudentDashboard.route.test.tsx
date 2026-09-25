import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { roleNavItems } from "@/components/DashboardSidebar";
import { usePortalAuth } from "./PortalAuthContext";
import PortalGuard from "./PortalGuard";

vi.mock("./PortalAuthContext", () => ({ usePortalAuth: vi.fn() }));

const renderStudentRoute = (path = "/portal/student") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/portal/student" element={<PortalGuard role="student"><div>student dashboard</div></PortalGuard>} />
      <Route path="/portal/student/notifications" element={<PortalGuard role="student"><div>student notifications</div></PortalGuard>} />
      <Route path="/portal/student/settings/notifications" element={<PortalGuard role="student"><div>student notification settings</div></PortalGuard>} />
      <Route path="/portal/student/settings" element={<PortalGuard role="student"><div>student account settings</div></PortalGuard>} />
      <Route path="/portal/student/messages" element={<PortalGuard role="student"><div>student messages</div></PortalGuard>} />
      <Route path="/portal/student/subscriptions" element={<PortalGuard role="student"><div>student subscriptions</div></PortalGuard>} />
      <Route path="/portal/student/subjects" element={<PortalGuard role="student"><div>student subjects</div></PortalGuard>} />
      <Route path="/portal/student/subjects/add" element={<PortalGuard role="student"><div>student add subject</div></PortalGuard>} />
      <Route path="/portal/student/subject-requests" element={<PortalGuard role="student"><div>student subject requests</div></PortalGuard>} />
      <Route path="/portal/student/change-requests" element={<PortalGuard role="student"><div>student change requests</div></PortalGuard>} />
      <Route path="/portal/student/schedule" element={<PortalGuard role="student"><div>student schedule</div></PortalGuard>} />
      <Route path="/portal/student/sessions" element={<PortalGuard role="student"><div>student sessions</div></PortalGuard>} />
      <Route path="/portal/student/assignments" element={<PortalGuard role="student"><div>student assignments</div></PortalGuard>} />
      <Route path="/portal/student/certificates" element={<PortalGuard role="student"><div>student certificates</div></PortalGuard>} />
      <Route path="/portal/student/evaluations" element={<PortalGuard role="student"><div>student evaluations</div></PortalGuard>} />
      <Route path="/portal/login" element={<div>portal login</div>} />
      <Route path="/portal/teacher" element={<div>teacher dashboard</div>} />
      <Route path="/admin" element={<div>admin dashboard</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("Student dashboard route", () => {
  it("allows a Student and exposes the Student dashboard navigation item", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute();
    expect(screen.getByText("student dashboard")).toBeInTheDocument();
    expect(roleNavItems.student.some((item) => item.path === "/portal/student" && item.label === "الرئيسية")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/notifications" && item.label === "الإشعارات")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/settings/notifications" && item.label === "إعدادات الإشعارات")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/messages" && item.label === "الرسائل")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/settings" && item.label === "إعدادات الحساب")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/subscriptions" && item.label === "الاشتراكات")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/subjects" && item.label === "المواد")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/subjects/add" && item.label === "إضافة مادة")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/subject-requests" && item.label === "طلبات المواد")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/change-requests" && item.label === "طلبات التغيير")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/assignments" && item.label === "الواجبات")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/certificates" && item.label === "الشهادات")).toBe(true);
    expect(roleNavItems.student.some((item) => item.path === "/portal/student/evaluations" && item.label === "تقييماتي")).toBe(true);
  });

  it("redirects an unauthenticated visitor to login", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute();
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student notifications route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/notifications");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student notification preferences route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/settings/notifications");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects and renders the Student account settings route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/settings");
    expect(screen.getByText("student account settings")).toBeInTheDocument();
  });

  it("protects the Student account settings route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/settings");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student messages route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/messages");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student subscriptions route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/subscriptions");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student subjects route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/subjects");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects the Student add-subject route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/subjects/add");
    expect(screen.getByText("portal login")).toBeInTheDocument();
  });

  it("protects and renders the Student subject-request history route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/subject-requests");
    expect(screen.getByText("student subject requests")).toBeInTheDocument();
  });

  it("protects and renders the Student change-request route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/change-requests");
    expect(screen.getByText("student change requests")).toBeInTheDocument();
  });

  it("protects and renders the Student schedule route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/schedule");
    expect(screen.getByText("student schedule")).toBeInTheDocument();
  });

  it("protects and renders the Student sessions route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/sessions");
    expect(screen.getByText("student sessions")).toBeInTheDocument();
  });

  it("protects and renders the Student assignments route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/assignments");
    expect(screen.getByText("student assignments")).toBeInTheDocument();
  });

  it("protects and renders the Student certificates route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/certificates");
    expect(screen.getByText("student certificates")).toBeInTheDocument();
  });

  it("protects and renders the Student evaluations route", () => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: "s1", role: "student" }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute("/portal/student/evaluations");
    expect(screen.getByText("student evaluations")).toBeInTheDocument();
  });

  it.each([
    ["teacher", "teacher dashboard"],
    ["admin", "admin dashboard"],
  ] as const)("keeps the %s default destination unchanged", (role, destination) => {
    vi.mocked(usePortalAuth).mockReturnValue({ user: { id: role, role }, loading: false } as ReturnType<typeof usePortalAuth>);
    renderStudentRoute();
    expect(screen.getByText(destination)).toBeInTheDocument();
  });
});
