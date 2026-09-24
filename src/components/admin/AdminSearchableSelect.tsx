import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AdminSearchableOption {
  value: string;
  label: string;
  searchText?: string;
}

interface AdminSearchableSelectProps {
  label: string;
  value?: string;
  options: AdminSearchableOption[];
  placeholder: string;
  allLabel?: string;
  onChange: (value?: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
  noOptionsLabel?: string;
  searchPlaceholder?: string;
  selectedOption?: AdminSearchableOption;
  onSearch?: (value: string) => void;
}

export default function AdminSearchableSelect({
  label,
  value,
  options,
  placeholder,
  allLabel,
  onChange,
  disabled = false,
  loading = false,
  error = false,
  loadingLabel = "جاري التحميل...",
  errorLabel = "تعذر تحميل الخيارات.",
  emptyLabel = "لا توجد نتائج مطابقة.",
  noOptionsLabel = "لا توجد خيارات متاحة.",
  searchPlaceholder,
  selectedOption,
  onSearch,
}: AdminSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value) || selectedOption;
  const matches = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    if (!normalized) return options;
    return options.filter((option) => `${option.label} ${option.searchText || ""}`.toLocaleLowerCase().includes(normalized));
  }, [options, search]);
  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return <div className="space-y-1">
    <span className="text-sm font-medium leading-none">{label}</span>
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} disabled={disabled || loading} className="h-10 w-full justify-between font-normal">
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {loading ? loadingLabel : error ? errorLabel : selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" dir="rtl">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={(next) => { setSearch(next); onSearch?.(next); }} placeholder={searchPlaceholder || `ابحث في ${label}...`} />
          <CommandList className="max-h-64">
            {error ? <CommandEmpty>{errorLabel}</CommandEmpty> : loading ? <CommandEmpty>{loadingLabel}</CommandEmpty> : matches.length === 0 ? <CommandEmpty>{search.trim() ? emptyLabel : noOptionsLabel}</CommandEmpty> : <CommandGroup>
              {allLabel && <CommandItem value="__all__" onSelect={() => { onChange(undefined); close(); }}><Check className={cn("ml-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} /><span>{allLabel}</span></CommandItem>}
              {matches.map((option) => <CommandItem key={option.value} value={`${option.label} ${option.searchText || ""}`} onSelect={() => { onChange(option.value); close(); }}>
                <Check className={cn("ml-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{option.label}</span>
              </CommandItem>)}
            </CommandGroup>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}
