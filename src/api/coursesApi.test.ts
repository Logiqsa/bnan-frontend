import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { coursesApi } from "./coursesApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("coursesApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the documented free enrollment endpoint and payload", () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        _id: "e1",
        course: "c1",
        mode: "group",
        status: "active",
        price: 0,
        currency: "EGP",
      },
    });
    void coursesApi.enrollFree("c1", "group");
    expect(apiRequest).toHaveBeenCalledWith("/courses/c1/enroll", {
      method: "POST",
      body: JSON.stringify({ mode: "group" }),
    });
  });

  it("passes the idempotency key to course checkout", () => {
    coursesApi.checkout(
      {
        courseId: "c1",
        mode: "individual",
        provider: "paymob",
        locale: "ar_SA",
        isMobile: false,
      },
      "attempt-1",
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/payment/courses/checkout",
      expect.objectContaining({
        method: "POST",
        headers: { "Idempotency-Key": "attempt-1" },
      }),
    );
  });

  it("keeps group and individual enrollments as modes on one course", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        _id: "c1",
        name: "Course",
        description: "Description",
        teacher: "t1",
        eligibleGrades: [],
        enrollmentModes: {
          group: { enabled: true, price: 500 },
          individual: { enabled: true, price: 1200 },
        },
        currency: "EGP",
        enrollmentOpen: true,
        status: "active",
      },
    });
    const body = {
      name: "Course",
      description: "Description",
      teacher: "t1",
      supervisor: null,
      grades: ["g1"],
      subject: "s1",
      requiredMinutes: 90,
      enrollmentModes: {
        group: { enabled: true, price: 500 },
        individual: { enabled: true, price: 1200 },
      },
      currency: "EGP",
      isPublished: true,
      enrollmentOpen: true,
    };
    await coursesApi.create(body);
    expect(
      JSON.parse(
        String((vi.mocked(apiRequest).mock.calls[0][1] as RequestInit).body),
      ),
    ).toMatchObject({ enrollmentModes: body.enrollmentModes });
    expect(
      JSON.parse(
        String((vi.mocked(apiRequest).mock.calls[0][1] as RequestInit).body),
      ),
    ).toMatchObject({
      grades: ["g1"],
      eligibleGrades: ["g1"],
      subject: "s1",
      requiredMinutes: 90,
    });
  });

  it("normalizes the deployed subjects array to the single course subject", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: [{
        _id: "c1",
        name: "Course",
        description: "Description",
        teacher: "t1",
        eligibleGrades: [],
        subjects: [{ id: "s1", name: "دين" }],
        enrollmentModes: { group: { enabled: true, price: 250 }, individual: { enabled: false, price: 0 } },
        currency: "EGP",
        enrollmentOpen: true,
        status: "active",
      }],
    });

    const courses = await coursesApi.listPublic();
    expect(courses[0].subject).toEqual({ id: "s1", name: "دين" });
  });

  it("uses classroom-scoped schedule endpoints", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { timezone: "Africa/Cairo", slots: [] },
    });
    await coursesApi.updateSchedule("room-1", {
      timezone: "Africa/Cairo",
      slots: [{ day: "sunday", startTime: "18:00", endTime: "19:00" }],
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/courses/classrooms/room-1/schedule",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("loads and normalizes course enrollments for admins", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        items: [{
          _id: "enrollment-1",
          course: "course-1",
          student: { fullName: "Student" },
          group: { _id: "group-1", name: "Group 1" },
          mode: "group",
          status: "active",
          price: 0,
          currency: "EGP",
        }],
        totalCount: 1,
      },
    });

    const result = await coursesApi.listEnrollments("course-1");

    expect(apiRequest).toHaveBeenCalledWith("/admin/courses/course-1/enrollments");
    expect(result.total).toBe(1);
    expect(result.enrollments[0]).toMatchObject({
      id: "enrollment-1",
      group: { id: "group-1", name: "Group 1" },
    });
  });

  it("loads teacher courses and starts a scheduled course session", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ success: true, data: [{ course: { _id: "course-1", name: "Course", eligibleGrades: [], enrollmentModes: { group: { enabled: true, price: 0 }, individual: { enabled: false, price: 0 } } }, groups: [{ _id: "group-1", name: "Group", status: "open", classroom: { _id: "room-1", name: "Room" } }] }] })
      .mockResolvedValueOnce({ success: true, data: { sessionId: "session-1", status: "live", canJoin: true, teacherStartUrl: "https://zoom.test/start" } });

    const assignments = await coursesApi.myTeachingCourses();
    expect(assignments[0]).toMatchObject({ course: { id: "course-1" }, groups: [{ id: "group-1", classroom: { id: "room-1" } }] });
    await coursesApi.startCourseSession("room-1", { courseId: "course-1", groupId: "group-1", occurrenceDate: "2026-09-08", scheduledStartTime: "18:00" });
    expect(apiRequest).toHaveBeenLastCalledWith("/courses/classrooms/room-1/sessions/start", expect.objectContaining({ method: "POST" }));
  });

  it("uploads the course image as multipart data", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { path: "uploads/courses/cover.webp" },
    });
    const file = new File(["image"], "cover.webp", { type: "image/webp" });
    await coursesApi.uploadImage(file);
    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit;
    expect(apiRequest).toHaveBeenCalledWith(
      "/admin/courses/images",
      expect.objectContaining({ method: "POST" }),
    );
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("image")).toBe(file);
    expect(options.headers).toBeUndefined();
  });
});
