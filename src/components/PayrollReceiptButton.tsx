import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function PayrollReceiptButton({ fetchReceipt, label = "عرض إيصال الدفع" }: { fetchReceipt: () => Promise<Blob>; label?: string }) {
  const [loading, setLoading] = useState(false);
  const openReceipt = async () => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) { toast.error("اسمح بفتح النوافذ المنبثقة لعرض الإيصال."); return; }
    setLoading(true);
    try {
      const blob = await fetchReceipt();
      const url = URL.createObjectURL(blob);
      popup.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      popup.close();
      toast.error("تعذر تحميل إيصال الدفع.");
    } finally { setLoading(false); }
  };
  return <Button type="button" variant="outline" size="sm" onClick={() => void openReceipt()} disabled={loading}>
    {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ExternalLink className="me-2 h-4 w-4" />}{label}
  </Button>;
}
