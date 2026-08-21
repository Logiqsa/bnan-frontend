import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins } from "lucide-react";
import { CURRENCIES, useCurrency } from "@/hooks/useCurrency";

interface Props {
  className?: string;
  compact?: boolean;
}

const CurrencySwitcher = ({ className, compact }: Props) => {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {!compact && (
        <span className="text-xs font-cairo text-muted-foreground flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" />
          العملة:
        </span>
      )}
      <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
        <SelectTrigger className="h-9 w-auto min-w-[120px] font-cairo text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="font-cairo text-sm">
              {c.label} ({c.symbol})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySwitcher;
