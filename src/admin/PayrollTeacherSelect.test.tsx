import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import PayrollTeacherSelect from "./PayrollTeacherSelect";

vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ pick: (_ar: string, en: string) => en }) }));
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});

const options = [
  { id: "6a9b9b4757544eac5456d45b", name: "Ahmed Hassan" },
  { id: "teacher-2", name: "Mona Ali" },
];

describe("PayrollTeacherSelect", () => {
  it("shows names without exposing the raw ID", () => {
    render(<PayrollTeacherSelect value="6a9b9b4757544eac5456d45b" options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Ahmed Hassan")).toBeInTheDocument();
    expect(screen.queryByText("6a9b9b4757544eac5456d45b")).not.toBeInTheDocument();
  });

  it("filters by name and shows the no-match state", () => {
    render(<PayrollTeacherSelect value="" options={options} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox"));
    const search = screen.getByPlaceholderText("Search by teacher name...");
    fireEvent.change(search, { target: { value: "mona" } });
    expect(screen.getByText("Mona Ali")).toBeInTheDocument();
    expect(screen.queryByText("Ahmed Hassan")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No teacher matches your search")).toBeInTheDocument();
  });

  it("keeps the selected name visible and returns only the internal ID", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PayrollTeacherSelect value="" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Mona Ali"));
    expect(onChange).toHaveBeenCalledWith("teacher-2");
    rerender(<PayrollTeacherSelect value="teacher-2" options={options} onChange={onChange} />);
    expect(screen.getByText("Mona Ali")).toBeInTheDocument();
  });

  it("shows a safe empty state", () => {
    render(<PayrollTeacherSelect value="" options={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("No teachers available")).toBeInTheDocument();
  });

  it("contains only search and teacher options inside the dropdown", () => {
    render(<PayrollTeacherSelect value="" options={options} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("Search by teacher name...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Curriculum")).not.toBeInTheDocument();
    expect(screen.getByText("Mona Ali")).toBeInTheDocument();
    expect(screen.getByText("Ahmed Hassan")).toBeInTheDocument();
  });
});
