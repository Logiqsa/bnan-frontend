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
