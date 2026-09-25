import { describe, expect, it } from "vitest";
import { isItemActive, roleNavItems } from "./DashboardSidebar";

const adminPaths = () => roleNavItems.admin.map((item) => item.path);

describe("Admin sidebar classroom navigation", () => {
  it("keeps the classroom entry and highlights it for Hub routes", () => {
    expect(roleNavItems.admin).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "الفصول", path: "/admin/classrooms" }),
    ]));
    expect(isItemActive("/admin/classrooms", "/admin/classrooms", "")).toBe(true);
    expect(isItemActive("/admin/classrooms", "/admin/classrooms/classroom-1", "?tab=assignments")).toBe(true);
    expect(isItemActive("/admin/classrooms", "/admin/classrooms/classroom-1/schedule", "")).toBe(true);
    expect(isItemActive("/admin/assignments", "/admin/classrooms/classroom-1", "?tab=assignments")).toBe(false);
  });

  it("preserves broader Admin and global navigation", () => {
    expect(adminPaths()).toEqual(expect.arrayContaining([
      "/admin/messages",
      "/admin/payroll",
      "/admin/payments",
      "/admin/subscriptions",
      "/admin/subject-requests",
      "/admin/classroom-change-requests",
      "/admin/classroom-zoom",
      "/admin/classroom-sessions",
      "/admin/classroom-recordings",
      "/admin/notifications",
      "/admin/catalog/curriculums",
    ]));
    expect(roleNavItems.admin).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "إدارة المحتوى الدراسي", path: "/admin/catalog/curriculums" }),
    ]));
    expect(adminPaths()).not.toContain("/admin/assignments");
    expect(adminPaths()).not.toContain("/admin/gulf-subject-requests");
  });

  it("highlights parent links for nested Teacher and Student pages", () => {
    expect(isItemActive("/portal/teacher/classrooms", "/portal/teacher/classrooms/room-1", "")).toBe(true);
    expect(isItemActive("/portal/teacher/courses", "/portal/teacher/courses/course-1/groups/group-1", "")).toBe(true);
    expect(isItemActive("/portal/student/courses", "/portal/student/courses/enrollment-1", "")).toBe(true);
    expect(isItemActive("/portal/student/subscriptions", "/portal/student/subscriptions/subscription-1/renew", "")).toBe(true);
  });
});
