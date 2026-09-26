import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PayrollReceiptButtonProps = {
  fetchReceipt?: () => Promise<Blob>;
  receiptUrl?: string;
  label?: string;
};

const isImageUrl = (value: string) => /\.(?:png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(value);

export default function PayrollReceiptButton({ fetchReceipt, receiptUrl, label = "عرض إيصال الدفع" }: PayrollReceiptButtonProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "document"; temporary: boolean } | null>(null);

  useEffect(() => () => {
    if (preview?.temporary) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const closePreview = () => {
    if (preview?.temporary) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const openReceipt = async () => {
    if (receiptUrl) {
      setPreview({ url: receiptUrl, type: isImageUrl(receiptUrl) ? "image" : "document", temporary: false });
      return;
    }
    if (!fetchReceipt) return;
    setLoading(true);
    try {
      const blob = await fetchReceipt();
      setPreview({ url: URL.createObjectURL(blob), type: blob.type.startsWith("image/") ? "image" : "document", temporary: true });
    } catch {
      toast.error("تعذر تحميل إيصال الدفع.");
    } finally { setLoading(false); }
  };
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => void openReceipt()} disabled={loading}>
      {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : preview?.type === "image" ? <ImageIcon className="me-2 h-4 w-4" /> : <FileText className="me-2 h-4 w-4" />}{label}
    </Button>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && closePreview()}>
      <DialogContent className="max-w-4xl overflow-hidden p-3 sm:p-4">
        <DialogHeader className="px-2 pt-1">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>عرض الإيصال داخل الموقع</DialogDescription>
        </DialogHeader>
        {preview?.type === "image" ? <div className="flex max-h-[72vh] items-center justify-center overflow-auto rounded-lg bg-muted/30 p-2"><img src={preview.url} alt={label} className="max-h-[68vh] max-w-full object-contain" /></div> : preview && <iframe title={label} src={preview.url} className="h-[72vh] w-full rounded-lg border bg-white" />}
      </DialogContent>
    </Dialog>
  </>;
}
