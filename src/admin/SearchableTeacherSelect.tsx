import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { CourseStaffOption } from "@/api/courseStaffApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function SearchableTeacherSelect({ value, options, onChange }: { value: string; options: CourseStaffOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal"><span className="truncate">{selected?.name || "اختر المعلم"}</span><ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl"><Command><CommandInput placeholder="ابحث باسم المعلم..." /><CommandList><CommandEmpty>لا يوجد معلم مطابق.</CommandEmpty><CommandGroup>{options.map((option) => <CommandItem key={option.id} value={option.name} onSelect={() => { onChange(option.id); setOpen(false); }}><Check className={cn("me-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} /><span className="truncate">{option.name}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
  </Popover>;
}
