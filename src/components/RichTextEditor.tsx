import { useEffect, useRef } from "react";
import { Bold, Italic, Link, List, ListOrdered, RemoveFormatting, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pastedLegalHtml } from "@/lib/legalContent";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const commandButtons = [
  { command: "bold", label: "عريض", icon: Bold },
  { command: "italic", label: "مائل", icon: Italic },
  { command: "underline", label: "تحته خط", icon: Underline },
  { command: "insertUnorderedList", label: "قائمة نقطية", icon: List },
  { command: "insertOrderedList", label: "قائمة رقمية", icon: ListOrdered },
  { command: "removeFormat", label: "إزالة التنسيق", icon: RemoveFormatting },
];

export default function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const execute = (command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    onChange(editorRef.current?.innerHTML || "");
  };

  const addLink = () => {
    const url = window.prompt("أدخل الرابط (يبدأ بـ https://)");
    if (url?.trim()) execute("createLink", url.trim());
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const html = pastedLegalHtml(
      event.clipboardData.getData("text/html"),
      event.clipboardData.getData("text/plain"),
    );

    if (html === null) return;

    event.preventDefault();
    execute("insertHTML", html);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2" role="toolbar" aria-label="أدوات تنسيق المحتوى">
        <Button type="button" size="sm" variant="ghost" onClick={() => execute("formatBlock", "h2")}>عنوان رئيسي</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => execute("formatBlock", "h3")}>عنوان فرعي</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => execute("formatBlock", "p")}>فقرة</Button>
        {commandButtons.map(({ command, label, icon: Icon }) => (
          <Button key={command} type="button" size="icon" variant="ghost" title={label} aria-label={label} onClick={() => execute(command)}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <Button type="button" size="icon" variant="ghost" title="إضافة رابط" aria-label="إضافة رابط" onClick={addLink}>
          <Link className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="محتوى الصفحة"
        aria-multiline="true"
        suppressContentEditableWarning
        onPaste={handlePaste}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="legal-rich-content min-h-[420px] px-4 py-3 text-right leading-8 outline-none"
        dir="rtl"
        data-placeholder="اكتب المحتوى هنا..."
      />
    </div>
  );
}
