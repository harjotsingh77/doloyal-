"use client";

import * as React from "react";
import { CheckCircle2, Loader2, MessageCircle, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@doloyal/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";

type SendState = "idle" | "sending" | "sent" | "error";

export interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    firstName?: string;
  };
  /** Pre-filled retention win-back copy */
  defaultMessage?: string;
  whatsappConnected: boolean;
  demoModeAvailable: boolean;
  businessNumber?: string | null;
  onSent?: () => void;
}

function retentionDefault(name: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return `Hi ${first}, we’d love to welcome you back. It’s been a while since your last visit. Book your next visit with us today.`;
}

export function SendWhatsAppDialog({
  open,
  onOpenChange,
  customer,
  defaultMessage,
  whatsappConnected,
  demoModeAvailable,
  businessNumber,
  onSent,
}: SendWhatsAppDialogProps) {
  const [messageType, setMessageType] = React.useState<"text" | "template">("text");
  const [body, setBody] = React.useState(defaultMessage || retentionDefault(customer.name));
  const [templateName, setTemplateName] = React.useState("");
  const [templates, setTemplates] = React.useState<Array<{ name: string; status?: string }>>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [useDemo, setUseDemo] = React.useState(false);
  const [sendState, setSendState] = React.useState<SendState>("idle");
  const [resultStatus, setResultStatus] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setBody(defaultMessage || retentionDefault(customer.name));
    setMessageType("text");
    setTemplateName("");
    setSendState("idle");
    setResultStatus(null);
    setErrorMessage(null);
    setUseDemo(!whatsappConnected && demoModeAvailable);
  }, [open, customer.name, defaultMessage, whatsappConnected, demoModeAvailable]);

  React.useEffect(() => {
    if (!open || !whatsappConnected) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const res = await api.listWhatsAppTemplates();
        if (!cancelled) setTemplates(Array.isArray(res?.templates) ? res.templates : []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, whatsappConnected]);

  const canSend =
    sendState !== "sending" &&
    (whatsappConnected || (demoModeAvailable && useDemo)) &&
    (messageType === "text" ? body.trim().length > 0 : templateName.trim().length > 0);

  const handleSend = async () => {
    if (!canSend) return;
    setSendState("sending");
    setErrorMessage(null);
    setResultStatus(null);
    try {
      const result = await api.sendWhatsAppMessage({
        customerId: customer.id,
        messageType,
        body: messageType === "text" ? body.trim() : undefined,
        templateName: messageType === "template" ? templateName.trim() : undefined,
        demo: useDemo && demoModeAvailable,
      });
      setSendState("sent");
      setResultStatus(result.deliveryStatus || (result.demo ? "DEMO" : "SENT"));
      toast.success(
        result.demo
          ? "Demo message recorded (not sent via WhatsApp)"
          : "WhatsApp message sent",
      );
      onSent?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "WhatsApp message could not be sent. Please check your WhatsApp Business connection and permissions.";
      setSendState("error");
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Send WhatsApp Message</DialogTitle>
              <DialogDescription>
                Message your existing customer from your connected WhatsApp Business number.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.35)] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="mt-0.5 text-[rgb(var(--color-muted-foreground))]">
                  Customer WhatsApp: {customer.phone}
                </p>
              </div>
              {businessNumber ? (
                <Badge variant="outline" className="text-[0.65rem]">
                  From {businessNumber}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">
              Business → existing customer · retention message
            </p>
          </div>

          {!whatsappConnected && !demoModeAvailable ? (
            <div className="rounded-lg border border-[rgb(var(--color-warning)/0.4)] bg-[rgb(var(--color-warning)/0.08)] p-3 text-sm">
              WhatsApp Business is not connected. Connect it under Integrations before sending.
            </div>
          ) : null}

          {demoModeAvailable ? (
            <label className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-border))] p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useDemo}
                onChange={(e) => setUseDemo(e.target.checked)}
                disabled={sendState === "sending"}
              />
              <span>
                <span className="font-medium">Demo mode</span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--color-muted-foreground))]">
                  Records the message in Doloyal only. Does not send through WhatsApp Business Messaging.
                </span>
              </span>
            </label>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="wa-msg-type">
              Message type
            </label>
            <Select
              value={messageType}
              onValueChange={(v) => setMessageType(v as "text" | "template")}
              disabled={sendState === "sending"}
            >
              <SelectTrigger id="wa-msg-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Session text (24h window)</SelectItem>
                <SelectItem value="template">Approved template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {messageType === "template" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wa-template">
                Approved template
              </label>
              {templates.length > 0 ? (
                <Select
                  value={templateName || undefined}
                  onValueChange={setTemplateName}
                  disabled={sendState === "sending" || loadingTemplates}
                >
                  <SelectTrigger id="wa-template">
                    <SelectValue placeholder={loadingTemplates ? "Loading…" : "Select template"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="wa-template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. winback_offer"
                  disabled={sendState === "sending"}
                />
              )}
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                Templates must be approved in Meta Business Manager for business-initiated messages.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wa-body">
                Message
              </label>
              <Textarea
                id="wa-body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sendState === "sending"}
                placeholder="Write a retention message for this customer…"
              />
            </div>
          )}

          {sendState === "sending" ? (
            <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--color-muted))] px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--color-primary))]" />
              Sending WhatsApp message…
            </div>
          ) : null}

          {sendState === "sent" ? (
            <div className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-success)/0.35)] bg-[rgb(var(--color-success)/0.08)] px-3 py-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-success))]" />
              <div>
                <p className="font-medium">
                  {resultStatus === "DEMO" ? "Demo recorded" : "Message sent"}
                </p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  Status: {resultStatus || "SENT"}
                  {resultStatus === "DEMO"
                    ? " · Not delivered via WhatsApp Business Messaging"
                    : " · Delivery updates appear when Meta webhooks confirm them"}
                </p>
              </div>
            </div>
          ) : null}

          {sendState === "error" && errorMessage ? (
            <div className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.08)] px-3 py-2 text-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-danger))]" />
              <p>{errorMessage}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sendState === "sending"}>
            {sendState === "sent" ? "Close" : "Cancel"}
          </Button>
          {sendState !== "sent" ? (
            <Button onClick={handleSend} loading={sendState === "sending"} disabled={!canSend}>
              Send
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
