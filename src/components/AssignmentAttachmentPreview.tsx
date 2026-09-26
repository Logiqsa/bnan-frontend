import { ExternalLink } from "lucide-react";
import { useState } from "react";
import MediaPreviewDialog from "@/components/MediaPreviewDialog";
import { Button } from "@/components/ui/button";

const safeUrl = (value: string) => {
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return `/${value}`;
};

export default function AssignmentAttachmentPreview({ url, label = "معاينة المرفق" }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const resolvedUrl = safeUrl(url);
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
      <ExternalLink className="me-2 h-4 w-4" />{label}
    </Button>
    <MediaPreviewDialog preview={open ? { title: label, url: resolvedUrl } : null} onClose={() => setOpen(false)} />
  </>;
}
