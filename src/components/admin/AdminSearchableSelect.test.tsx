import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminSearchableSelect from "./AdminSearchableSelect";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.assign(globalThis, { ResizeObserver: TestResizeObserver });
HTMLElement.prototype.scrollIntoView = () => {};

describe("AdminSearchableSelect", () => {
  it("filters Arabic labels and returns the raw selected value", () => {
    const onChange = vi.fn();
    render(<AdminSearchableSelect label="الطالب" value="" placeholder="اختر الطالب" allLabel="كل الطلاب" options={[{ value: "student-1", label: "محمد علي" }, { value: "student-2", label: "سارة أحمد" }]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "الطالب" }));
    fireEvent.change(screen.getByPlaceholderText("ابحث بالاسم..."), { target: { value: "سارة" } });
    expect(screen.getByText("سارة أحمد")).toBeInTheDocument();
    expect(screen.queryByText("محمد علي")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("سارة أحمد"));

    expect(onChange).toHaveBeenCalledWith("student-2");
    expect(screen.queryByPlaceholderText("ابحث بالاسم...")).not.toBeInTheDocument();
  });

  it("restores all options when the search is cleared", () => {
    render(<AdminSearchableSelect label="الطالب" value="" placeholder="اختر الطالب" options={[{ value: "student-1", label: "محمد علي" }, { value: "student-2", label: "سارة أحمد" }]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "الطالب" }));
    const input = screen.getByPlaceholderText("ابحث بالاسم...");
    fireEvent.change(input, { target: { value: "سارة" } });
    expect(screen.queryByText("محمد علي")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("محمد علي")).toBeInTheDocument();
    expect(screen.getByText("سارة أحمد")).toBeInTheDocument();
  });

  it("supports clearing an optional filter", () => {
    const onChange = vi.fn();
    render(<AdminSearchableSelect label="المعلم" value="teacher-1" placeholder="اختر المعلم" allLabel="كل المعلمين" options={[{ value: "teacher-1", label: "أحمد" }]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "المعلم" }));
    fireEvent.click(screen.getByText("كل المعلمين"));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("highlights only the selected id when names are duplicated", () => {
    render(<AdminSearchableSelect label="المعلم" value="2" placeholder="اختر المعلم" options={[{ value: "1", label: "محمود" }, { value: "2", label: "محمود" }, { value: "3", label: "محمد" }]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "المعلم" }));
    const options = screen.getAllByRole("option");
    const محمودOptions = options.filter((option) => option.textContent?.includes("محمود"));

    expect(محمودOptions).toHaveLength(2);
    expect(محمودOptions[0].querySelector("svg")).toHaveClass("opacity-0");
    expect(محمودOptions[1].querySelector("svg")).toHaveClass("opacity-100");
  });

  it("shows the requested empty state for unmatched names", () => {
    render(<AdminSearchableSelect label="الطالب" value="" placeholder="اختر الطالب" options={[{ value: "student-1", label: "محمد علي" }]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "الطالب" }));
    fireEvent.change(screen.getByPlaceholderText("ابحث بالاسم..."), { target: { value: "اسم غير موجود" } });

    expect(screen.getByText("لا توجد نتائج")).toBeInTheDocument();
  });
});
