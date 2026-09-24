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
    fireEvent.change(screen.getByPlaceholderText("ابحث في الطالب..."), { target: { value: "سارة" } });
    expect(screen.getByText("سارة أحمد")).toBeInTheDocument();
    expect(screen.queryByText("محمد علي")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("سارة أحمد"));

    expect(onChange).toHaveBeenCalledWith("student-2");
  });

  it("supports clearing an optional filter", () => {
    const onChange = vi.fn();
    render(<AdminSearchableSelect label="المعلم" value="teacher-1" placeholder="اختر المعلم" allLabel="كل المعلمين" options={[{ value: "teacher-1", label: "أحمد" }]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "المعلم" }));
    fireEvent.click(screen.getByText("كل المعلمين"));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
