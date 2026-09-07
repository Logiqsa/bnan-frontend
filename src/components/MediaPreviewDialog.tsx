import { ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface MediaPreview {
  title: string;
  url: string;
  kind?: "image" | "video" | "document";
}

const youtubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
};

const inferredKind = (preview: MediaPreview) => {
  if (preview.kind) return preview.kind;
  const path = preview.url.split(/[?#]/)[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(path)) return "image";
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return "video";
  return "document";
};

export default function MediaPreviewDialog({ preview, onClose }: { preview: MediaPreview | null; onClose: () => void }) {
  const youtubeUrl = preview ? youtubeEmbedUrl(preview.url) : "";
  const kind = preview ? inferredKind(preview) : "document";

  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[90vh] w-[96vw] max-w-6xl overflow-hidden p-0" dir="rtl">
        <DialogHeader className="border-b px-5 py-4 text-right">
          <DialogTitle>{preview?.title}</DialogTitle>
          <DialogDescription>معاينة داخل الموقع</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-3" style={{ height: "calc(90vh - 82px)" }}>
          {preview && kind === "image" ? (
            <img src={preview.url} alt={preview.title} className="h-full w-full object-contain" />
          ) : preview && (kind === "video" || youtubeUrl) ? (
            youtubeUrl ? (
              <iframe src={youtubeUrl} title={preview.title} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <video src={preview.url} className="h-full w-full bg-black object-contain" controls playsInline preload="metadata" />
            )
          ) : preview ? (
            <div className="grid h-full place-items-center rounded-lg border bg-background p-6 text-center">
              <div className="space-y-4">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">هذا الملف يُفتح خارج المعاينة الداخلية.</p>
                <Button asChild className="gap-2">
                  <a href={preview.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    فتح الملف في تبويب جديد
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
