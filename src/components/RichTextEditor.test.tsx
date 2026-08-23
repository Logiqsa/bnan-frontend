import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RichTextEditor from "./RichTextEditor";

const paste = (element: HTMLElement, values: Record<string, string>) =>
  fireEvent.paste(element, {
    clipboardData: { getData: (type: string) => values[type] || "" },
  });

describe("RichTextEditor paste", () => {
  const execCommand = vi.fn();

  beforeEach(() => {
    execCommand.mockReset();
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
  });

  it("converts literal HTML text into formatted editor HTML", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    const editor = screen.getByRole("textbox");

    paste(editor, {
      "text/plain": "<h1>الشروط والأحكام</h1><p>نص <strong>مهم</strong></p><ul><li>بند</li></ul>",
    });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<h1>الشروط والأحكام</h1><p>نص <strong>مهم</strong></p><ul><li>بند</li></ul>",
    );
  });

  it("removes executable markup and unsafe attributes before inserting", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    const editor = screen.getByRole("textbox");

    paste(editor, {
      "text/html": '<h2 onclick="alert(1)">عنوان</h2><script>alert(1)</script><iframe src="x"></iframe><p><a href="javascript:alert(1)" style="color:red">رابط</a></p>',
    });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<h2>عنوان</h2><p><a>رابط</a></p>",
    );
  });

  it("converts ordinary plain text into paragraphs and line breaks", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    paste(screen.getByRole("textbox"), { "text/plain": "سطر أول\nسطر ثان\n\nفقرة أخرى" });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<p>سطر أول<br>سطر ثان</p><p>فقرة أخرى</p>",
    );
  });

  it("converts Markdown headings and lists", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    paste(screen.getByRole("textbox"), {
      "text/plain": "# سياسة الخصوصية\n\n## البيانات\n\n* الاسم\n* البريد\n\n1. الأول\n2. الثاني",
    });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      "<h1>سياسة الخصوصية</h1>\n<h2>البيانات</h2>\n<ul>\n<li>الاسم</li>\n<li>البريد</li>\n</ul>\n<ol>\n<li>الأول</li>\n<li>الثاني</li>\n</ol>\n",
    );
  });

  it("converts Markdown bold, italic, and safe links", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    paste(screen.getByRole("textbox"), {
      "text/plain": "نص **عريض** و*مائل* مع [رابط](https://example.com).",
    });

    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      '<p>نص <strong>عريض</strong> و<em>مائل</em> مع <a href="https://example.com" target="_blank" rel="noopener noreferrer">رابط</a>.</p>\n',
    );
  });

  it("sanitizes HTML embedded in Markdown and unsafe Markdown links", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    paste(screen.getByRole("textbox"), {
      "text/plain": '# عنوان\n\n<script>alert(1)</script>\n\n[خطر](javascript:alert(1))\n\n<img src=x onerror="alert(1)">',
    });

    const insertedHtml = execCommand.mock.calls[0][2] as string;
    expect(insertedHtml).not.toMatch(/script|javascript:|onerror|iframe/i);
    expect(insertedHtml).toContain("<h1>عنوان</h1>");
  });

  it("keeps existing saved HTML content unchanged", () => {
    const existingHtml = "<h2>عنوان محفوظ</h2><p>محتوى <strong>قديم</strong></p>";
    render(<RichTextEditor value={existingHtml} onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveProperty("innerHTML", existingHtml);
  });

  it("does not truncate large HTML documents", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    const largeHtml = Array.from(
      { length: 2_000 },
      (_, index) => `<p>فقرة قانونية رقم ${index}</p>`,
    ).join("");

    paste(screen.getByRole("textbox"), { "text/plain": largeHtml });

    expect(execCommand).toHaveBeenCalledWith("insertHTML", false, largeHtml);
  });
});
