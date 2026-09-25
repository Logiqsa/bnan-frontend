import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AdminSearchableOption {
  value: string;
  label: string;
  searchText?: string;
}

const normalizeValue = (value: string | number | null | undefined) => value == null ? "" : String(value);

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
  emptyLabel = "لا توجد نتائج",
  noOptionsLabel = "لا توجد خيارات متاحة.",
  searchPlaceholder,
  selectedOption,
  onSearch,
}: AdminSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedValue = normalizeValue(value);
  const selected = options.find((option) => normalizeValue(option.value) === selectedValue) || selectedOption;
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
      <PopoverContent side="bottom" align="start" collisionPadding={8} className="w-[var(--radix-popover-trigger-width)] max-h-[calc(100vh-2rem)] overflow-hidden p-0" dir="rtl">
        <Command shouldFilter={false} className="max-h-[min(24rem,calc(100vh-2rem))] overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b px-3" dir="rtl">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={search}
              onChange={(event) => { setSearch(event.target.value); onSearch?.(event.target.value); }}
              placeholder={searchPlaceholder || "ابحث بالاسم..."}
              aria-label={`بحث ${label}`}
              className="h-11 w-full bg-transparent py-3 text-right text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[min(18rem,calc(100vh-8rem))] overflow-y-auto overflow-x-hidden">
            {error ? <CommandEmpty>{errorLabel}</CommandEmpty> : loading ? <CommandEmpty>{loadingLabel}</CommandEmpty> : matches.length === 0 ? <CommandEmpty>{search.trim() ? emptyLabel : noOptionsLabel}</CommandEmpty> : <CommandGroup>
              {allLabel && <CommandItem value="__all__" className="mb-1 border-b font-medium text-muted-foreground" onSelect={() => { onChange(undefined); close(); }}><Check className={cn("ml-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} /><span>{allLabel}</span></CommandItem>}
              {matches.map((option) => <CommandItem key={option.value} value={normalizeValue(option.value)} onSelect={() => { onChange(option.value); close(); }}>
                <Check className={cn("ml-2 h-4 w-4", normalizeValue(option.value) === selectedValue ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{option.label}</span>
              </CommandItem>)}
            </CommandGroup>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}
