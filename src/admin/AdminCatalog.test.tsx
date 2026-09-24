import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCatalog from "./AdminCatalog";

const mocks = vi.hoisted(() => ({
  curriculums: vi.fn(),
  createCurriculum: vi.fn(),
  updateCurriculum: vi.fn(),
  deleteCurriculum: vi.fn(),
  grades: vi.fn(),
  createGrade: vi.fn(),
  updateGrade: vi.fn(),
  deleteGrade: vi.fn(),
  subjects: vi.fn(),
  subjectsByCurriculum: vi.fn(),
}));
vi.mock("@/api/catalogApi", () => ({ catalogApi: mocks }));
vi.mock("@/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderPage = (path = "/admin/catalog/curriculums") =>
  render(
    <QueryClientProvider client={client()}>
      <MemoryRouter initialEntries={[path]}>
        <AdminCatalog />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("AdminCatalog", () => {
  beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()));
  it("renders curriculum data and the create action", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [
        {
          id: "c1",
          name: "المنهج المصري",
          description: "وصف",
          registrationMode: "egyptian",
        },
      ],
    });
    renderPage();
    expect(await screen.findByText("المنهج المصري")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إضافة منهج/ }),
    ).toBeInTheDocument();
  });

  it("shows the retry state for a failed catalog request", async () => {
    mocks.curriculums.mockRejectedValue(new Error("network"));
    renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("إعادة المحاولة")).toBeInTheDocument();
  });

  it("makes subjects depend on curriculum then grade", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [
        { id: "c1", name: "المنهج المصري", registrationMode: "egyptian" },
        { id: "c2", name: "المنهج الخليجي", registrationMode: "gulf" },
      ],
    });
    mocks.grades.mockImplementation((curriculum: string) =>
      Promise.resolve({
        success: true,
        data:
          curriculum === "c1"
            ? [{ id: "g1", name: "الأول", isActive: true }]
            : [{ id: "g2", name: "الثاني", isActive: true }],
      }),
    );
    mocks.subjects.mockImplementation((grade: string) =>
      Promise.resolve({
        success: true,
        data:
          grade === "g1"
            ? [{ id: "s1", name: "رياضيات" }]
            : [{ id: "s2", name: "علوم" }],
      }),
    );
    renderPage("/admin/catalog/subjects");
    const selects = await screen.findAllByRole("combobox");
    expect(selects[1]).toBeDisabled();
    expect(screen.getByText("اختر المنهج لعرض الصفوف.")).toBeInTheDocument();
    fireEvent.change(selects[0], { target: { value: "c1" } });
    await waitFor(() => expect(selects[1]).not.toBeDisabled());
    expect(screen.getByText("اختر الصف لعرض المواد.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إضافة مادة/ })).toBeDisabled();
    fireEvent.change(selects[1], { target: { value: "g1" } });
    expect(await screen.findByText("رياضيات")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إضافة مادة/ }),
    ).not.toBeDisabled();
    expect(screen.queryByText("علوم")).not.toBeInTheDocument();
    fireEvent.change(selects[0], { target: { value: "c2" } });
    await waitFor(() => expect(selects[1]).toHaveValue(""));
    expect(screen.getByText("اختر الصف لعرض المواد.")).toBeInTheDocument();
  });

  it("shows the empty state for a selected grade with no subjects", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [{ id: "c1", name: "منهج", registrationMode: "egyptian" }],
    });
    mocks.grades.mockResolvedValue({
      success: true,
      data: [{ id: "g1", name: "صف", isActive: true }],
    });
    mocks.subjects.mockResolvedValue({ success: true, data: [] });
    renderPage("/admin/catalog/subjects");
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "c1" } });
    await waitFor(() => expect(selects[1]).not.toBeDisabled());
    fireEvent.change(selects[1], { target: { value: "g1" } });
    expect(
      await screen.findByText("لا توجد مواد مرتبطة بهذا الصف."),
    ).toBeInTheDocument();
  });

  it("derives Egyptian study languages from grade names and filters grades", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [{ id: "c1", name: "مصري", registrationMode: "egyptian" }],
    });
    mocks.grades.mockResolvedValue({
      success: true,
      data: [
        { id: "ga", name: "الصف الأول عربي", isActive: true },
        { id: "gl", name: "الصف الأول لغات", isActive: true },
        { id: "go", name: "صف غير مصنف", isActive: true },
      ],
    });
    mocks.subjects.mockResolvedValue({
      success: true,
      data: [{ id: "sa", name: "مادة عربي" }],
    });
    renderPage("/admin/catalog/subjects");
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "c1" } });
    expect(
      await screen.findByText("اختر لغة الدراسة لعرض الصفوف."),
    ).toBeInTheDocument();
    const languageSelect = (await screen.findAllByRole("combobox"))[1];
    expect(screen.getByRole("option", { name: "عربي" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "لغات" })).toBeInTheDocument();
    fireEvent.change(languageSelect, { target: { value: "arabic" } });
    const gradeSelect = (await screen.findAllByRole("combobox"))[2];
    expect(
      within(gradeSelect).getByRole("option", { name: "الصف الأول عربي" }),
    ).toBeInTheDocument();
    expect(
      within(gradeSelect).queryByRole("option", { name: "الصف الأول لغات" }),
    ).not.toBeInTheDocument();
    fireEvent.change(gradeSelect, { target: { value: "ga" } });
    expect(await screen.findByText("مادة عربي")).toBeInTheDocument();
  });

  it("applies the same language filter to the Grades tab", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [{ id: "c1", name: "مصري", registrationMode: "egyptian" }],
    });
    mocks.grades.mockResolvedValue({
      success: true,
      data: [
        { id: "ga", name: "الأول عربي", isActive: true },
        { id: "gl", name: "الأول لغات", isActive: true },
        { id: "go", name: "الأول", isActive: true },
      ],
    });
    mocks.subjectsByCurriculum.mockResolvedValue({ success: true, data: [] });
    renderPage("/admin/catalog/grades");
    const curriculumSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.change(curriculumSelect, { target: { value: "c1" } });
    expect(
      await screen.findByText("اختر لغة الدراسة لعرض الصفوف."),
    ).toBeInTheDocument();
    const selects = await screen.findAllByRole("combobox");
    expect(screen.getByRole("button", { name: /إضافة صف/ })).toBeDisabled();
    fireEvent.change(selects[1], { target: { value: "languages" } });
    expect(await screen.findByText("الأول لغات")).toBeInTheDocument();
    expect(screen.queryByText("الأول عربي")).not.toBeInTheDocument();
    expect(
      screen.queryByText("الأول", { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إضافة صف/ })).not.toBeDisabled();
  });

  it("keeps the Gulf Grades flow without a study-language selector", async () => {
    mocks.curriculums.mockResolvedValue({
      success: true,
      data: [{ id: "c1", name: "خليجي", registrationMode: "gulf" }],
    });
    mocks.grades.mockResolvedValue({
      success: true,
      data: [{ id: "g1", name: "الصف الأول", isActive: true }],
    });
    mocks.subjectsByCurriculum.mockResolvedValue({ success: true, data: [] });
    renderPage("/admin/catalog/grades");
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "c1" } });
    await waitFor(() =>
      expect(screen.getAllByRole("combobox")).toHaveLength(1),
    );
    expect(screen.queryByText("لغة الدراسة")).not.toBeInTheDocument();
    expect(await screen.findByText("الصف الأول")).toBeInTheDocument();
  });
});
