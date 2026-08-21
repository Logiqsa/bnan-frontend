import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ZOOM_REQUIRED_EVENTS, ZOOM_REQUIRED_SCOPES } from "@/api/zoomAccountsApi";

const WebhookInfo = ({ webhookUrl }: { webhookUrl: string }) => {
  const copy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("تم نسخ رابط الـ Webhook");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-cairo font-semibold">رابط الـ Webhook</label>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs ltr:text-left" dir="ltr" />
          <Button type="button" variant="outline" size="icon" onClick={copy} title="نسخ رابط الـ Webhook">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-tajawal leading-relaxed">
          استخدم هذا الرابط داخل: Zoom Marketplace ← Feature ← Event Subscriptions ← Event Notification Endpoint URL ← Validate ← Add Events ← Activate App
        </p>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="events">
          <AccordionTrigger className="text-sm font-cairo">أحداث Zoom المطلوبة (Events)</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 text-xs font-mono text-muted-foreground">
              {ZOOM_REQUIRED_EVENTS.map((event) => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="scopes">
          <AccordionTrigger className="text-sm font-cairo">الصلاحيات المطلوبة (Scopes)</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 text-xs font-mono text-muted-foreground break-all">
              {ZOOM_REQUIRED_SCOPES.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default WebhookInfo;
