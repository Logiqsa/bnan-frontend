import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { catalogApi } from "@/api/catalogApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("catalog API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the production catalog read paths", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [] });
    await catalogApi.curriculums();
    await catalogApi.grades("curriculum-1");
    await catalogApi.subjectsByCurriculum("curriculum-1");
    await catalogApi.packages("curriculum-1");
    expect(vi.mocked(apiRequest).mock.calls.map(([path]) => path)).toEqual([
      "/curriculums?page=1&limit=100&sort=name&fields=name,description,registrationMode,icon",
      "/grades/curriculum/curriculum-1?page=1&limit=100&isActive=true&fields=name,isActive",
      "/subjects/curriculum/curriculum-1?page=1&limit=100&fields=name,curriculum,grades",
      "/packages/curriculum/curriculum-1",
    ]);
  });

  it("keeps catalog mutations on the existing REST endpoints", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await catalogApi.createGrade({ name: "الصف الأول", curriculum: "curriculum-1" });
    await catalogApi.updateSubject("subject-1", { name: "رياضيات", grades: ["grade-1"] });
    await catalogApi.addSubjectsToGrade("grade-1", ["subject-1"]);
    await catalogApi.deletePackage("package-1");
    expect(vi.mocked(apiRequest).mock.calls.map(([path, options]) => [path, options?.method, options?.body])).toEqual([
      ["/grades", "POST", JSON.stringify({ name: "الصف الأول", curriculum: "curriculum-1" })],
      ["/subjects/subject-1", "PATCH", JSON.stringify({ name: "رياضيات", grades: ["grade-1"] })],
      ["/grades/grade-1/subjects", "PATCH", JSON.stringify({ subjects: ["subject-1"] })],
      ["/packages/package-1", "DELETE", undefined],
    ]);
  });
});
