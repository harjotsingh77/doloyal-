"use client";

import * as React from "react";
import { AlertTriangle, Check, CheckCheck, Clock, Loader2, MessageCircle, XCircle } from "lucide-react";
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
import { api, type WhatsAppTemplateSummary } from "@/lib/api";
import { toast } from "sonner";

type Phase = "compose" | "sending" | "result" | "error";

type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "DEMO";

const STEPS: Array<{ status: DeliveryStatus; label: string }> = [
  { status: "QUEUED", label: "Accepted" },
  { status: "SENT", label: "Sent" },
  { status: "DELIVERED", label: "Delivered" },
  { status: "READ", label: "Read" },
];
const RANK: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3 };
const POLL_INTERVAL_MS = 2500;
const POLL_WINDOW_MS = 3 * 60 * 1000;

export interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    /** International format resolved by the backend, e.g. "+91 98765 43210". */
    whatsappNumber?: string | null;
  };
  /** Pre-filled retention win-back copy */
  defaultMessage?: string;
  whatsappConnected: boolean;
  demoModeAvailable: boolean;
  /** False when no webhook secret is configured, so delivery receipts can't arrive. */
  webhookConfigured?: boolean;
  businessNumber?: string | null;
  /** Called after every send attempt (success or failure) and on each confirmed status change. */
  onActivity?: () => void;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function retentionDefault(name: string) {
  return `Hi ${firstName(name)}, we’d love to welcome you back!\nIt’s been a while since your last visit.\nBook your next visit with us today.`;
}

function templateKey(t: { name: string; language: string }) {
  return `${t.name}::${t.language}`;
}

function templateBodyText(t?: WhatsAppTemplateSummary | null) {
  return t?.components?.find((c) => c.type?.toUpperCase() === "BODY")?.text || "";
}

function placeholderCount(text: string) {
  let max = 0;
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1]));
  return max;
}

function statusHeadline(status: DeliveryStatus) {
  switch (status) {
    case "QUEUED":
      return "Accepted by WhatsApp";
    case "SENT":
      return "Sent";
    case "DELIVERED":
      return "Delivered";
    case "READ":
      return "Read by customer";
    case "FAILED":
      return "Failed";
    case "DEMO":
      return "Demo recorded";
  }
}

function formatTime(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function SendWhatsAppDialog({
  open,
  onOpenChange,
  customer,
  defaultMessage,
  whatsappConnected,
  demoModeAvailable,
  webhookConfigured = true,
  businessNumber,
  onActivity,
}: SendWhatsAppDialogProps) {
  const [messageType, setMessageType] = React.useState<"text" | "template">("text");
  const [body, setBody] = React.useState(defaultMessage || retentionDefault(customer.name));
  const [templates, setTemplates] = React.useState<WhatsAppTemplateSummary[]>([]);
  const [templatesError, setTemplatesError] = React.useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState("");
  const [manualTemplateName, setManualTemplateName] = React.useState("");
  const [manualTemplateLanguage, setManualTemplateLanguage] = React.useState("en_US");
  const [templateParams, setTemplateParams] = React.useState<string[]>([]);
  const [useDemo, setUseDemo] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("compose");
  const [status, setStatus] = React.useState<DeliveryStatus | null>(null);
  const [statusTimestamps, setStatusTimestamps] = React.useState<Record<string, string>>({});
  const [notificationId, setNotificationId] = React.useState<string | null>(null);
  const [providerMessageId, setProviderMessageId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [pollingDone, setPollingDone] = React.useState(false);

  const recipientNumber = customer.whatsappNumber || customer.phone;
  const activeTemplate = templates.find((t) => templateKey(t) === selectedTemplate) || null;
  const activeTemplateBody = templateBodyText(activeTemplate);
  const neededParams = placeholderCount(activeTemplateBody);
  const busy = phase === "sending";
  const sent = phase === "result";

  React.useEffect(() => {
    if (!open) return;
    setBody(defaultMessage || retentionDefault(customer.name));
    setMessageType("text");
    setSelectedTemplate("");
    setManualTemplateName("");
    setManualTemplateLanguage("en_US");
    setTemplateParams([]);
    setPhase("compose");
    setStatus(null);
    setStatusTimestamps({});
    setNotificationId(null);
    setProviderMessageId(null);
    setErrorMessage(null);
    setPollingDone(false);
    setUseDemo(!whatsappConnected && demoModeAvailable);
  }, [open, customer.name, defaultMessage, whatsappConnected, demoModeAvailable]);

  React.useEffect(() => {
    if (!open || !whatsappConnected) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      setTemplatesError(null);
      try {
        const res = await api.listWhatsAppTemplates();
        if (!cancelled) setTemplates(Array.isArray(res?.templates) ? res.templates : []);
      } catch (err) {
        if (!cancelled) {
          setTemplates([]);
          setTemplatesError(err instanceof Error ? err.message : "Could not load approved templates.");
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, whatsappConnected]);

  React.useEffect(() => {
    if (!activeTemplate) return;
    const count = placeholderCount(templateBodyText(activeTemplate));
    setTemplateParams(Array.from({ length: count }, (_, i) => (i === 0 ? firstName(customer.name) : "")));
  }, [activeTemplate, customer.name]);

  // Live delivery status: only values stored from the send response or Meta webhooks.
  const onActivityRef = React.useRef(onActivity);
  onActivityRef.current = onActivity;
  React.useEffect(() => {
    if (!open || phase !== "result" || !notificationId || status === "DEMO") return;
    if (status === "READ" || status === "FAILED") return;
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_WINDOW_MS) {
        setPollingDone(true);
        return;
      }
      try {
        const res = await api.getWhatsAppMessageStatus(notificationId);
        if (cancelled) return;
        const next = res.deliveryStatus as DeliveryStatus;
        setStatusTimestamps(res.statusTimestamps || {});
        if (res.providerMessageId) setProviderMessageId(res.providerMessageId);
        if (next !== status) {
          setStatus(next);
          if (next === "FAILED") {
            setErrorMessage(res.error || "WhatsApp could not deliver this message.");
            toast.error(res.error || "WhatsApp could not deliver this message.");
          }
          onActivityRef.current?.();
          return;
        }
      } catch {
        // Transient polling errors are ignored; the next tick retries.
      }
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, phase, notificationId, status]);

  const templateReady =
    messageType === "template" &&
    (activeTemplate
      ? templateParams.slice(0, neededParams).every((p) => p.trim().length > 0)
      : templates.length === 0 && manualTemplateName.trim().length > 0);

  const canSend =
    phase === "compose" &&
    (whatsappConnected || (demoModeAvailable && useDemo)) &&
    (messageType === "text" ? body.trim().length > 0 : templateReady);

  const handleSend = async () => {
    if (!canSend) return;
    setPhase("sending");
    setErrorMessage(null);
    try {
      const result = await api.sendWhatsAppMessage({
        customerId: customer.id,
        messageType,
        body: messageType === "text" ? body.trim() : undefined,
        templateName:
          messageType === "template" ? activeTemplate?.name || manualTemplateName.trim() : undefined,
        templateLanguage:
          messageType === "template"
            ? activeTemplate?.language || manualTemplateLanguage.trim() || "en_US"
            : undefined,
        templateParams:
          messageType === "template" && activeTemplate ? templateParams.slice(0, neededParams) : undefined,
        demo: useDemo && demoModeAvailable,
      });
      const initial = (result.deliveryStatus || (result.demo ? "DEMO" : "QUEUED")) as DeliveryStatus;
      setStatus(initial);
      setNotificationId(result.notificationId || null);
      setProviderMessageId(result.providerMessageId || null);
      setStatusTimestamps({ [initial]: new Date().toISOString() });
      setPhase("result");
      toast.success(
        result.demo ? "Demo message recorded (not sent via WhatsApp)" : "Message accepted by WhatsApp",
      );
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "WhatsApp API returned an error. Please try again.";
      setPhase("error");
      setStatus("FAILED");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      onActivityRef.current?.();
    }
  };

  const templatePreview = activeTemplate
    ? activeTemplateBody.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n) => templateParams[Number(n) - 1] || `{{${n}}}`)
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => (!busy ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Send WhatsApp Message</DialogTitle>
              <DialogDescription>
                Sent from your connected WhatsApp Business number through the WhatsApp Cloud API.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.35)] p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Customer</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">WhatsApp</p>
              <p className="font-medium tabular-nums">{recipientNumber}</p>
            </div>
            {businessNumber ? (
              <div className="sm:col-span-2">
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">From</p>
                <p className="font-medium tabular-nums">{businessNumber}</p>
              </div>
            ) : null}
          </div>

          {!whatsappConnected ? (
            <div className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-warning)/0.4)] bg-[rgb(var(--color-warning)/0.08)] p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-warning))]" />
              <span>WhatsApp connection is incomplete. Please reconnect your account under Integrations before sending.</span>
            </div>
          ) : null}

          {demoModeAvailable ? (
            <label className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-border))] p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useDemo}
                onChange={(e) => setUseDemo(e.target.checked)}
                disabled={phase !== "compose"}
              />
              <span>
                <span className="font-medium">Demo mode</span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--color-muted-foreground))]">
                  Records the message in Doloyal only. Does not send through WhatsApp Business Messaging.
                </span>
              </span>
            </label>
          ) : null}

          {phase === "compose" || phase === "sending" || phase === "error" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="wa-msg-type">
                  Message type
                </label>
                <Select
                  value={messageType}
                  onValueChange={(v) => setMessageType(v as "text" | "template")}
                  disabled={busy}
                >
                  <SelectTrigger id="wa-msg-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="template">Approved template</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  {messageType === "text"
                    ? "WhatsApp only delivers free-form text if this customer messaged you in the last 24 hours. Otherwise use an approved template."
                    : "Approved templates can be sent anytime, including to customers who haven’t messaged you recently."}
                </p>
              </div>

              {messageType === "template" ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="wa-template">
                      Approved template
                    </label>
                    {loadingTemplates ? (
                      <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-muted-foreground))]">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading approved templates…
                      </div>
                    ) : templates.length > 0 ? (
                      <Select value={selectedTemplate || undefined} onValueChange={setSelectedTemplate} disabled={busy}>
                        <SelectTrigger id="wa-template">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={templateKey(t)} value={templateKey(t)}>
                              {t.name} · {t.language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                        <Input
                          id="wa-template"
                          value={manualTemplateName}
                          onChange={(e) => setManualTemplateName(e.target.value)}
                          placeholder="Template name, e.g. hello_world"
                          disabled={busy}
                        />
                        <Input
                          aria-label="Template language"
                          value={manualTemplateLanguage}
                          onChange={(e) => setManualTemplateLanguage(e.target.value)}
                          placeholder="en_US"
                          disabled={busy}
                        />
                      </div>
                    )}
                    {templatesError && templates.length === 0 ? (
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{templatesError}</p>
                    ) : null}
                  </div>

                  {activeTemplate && neededParams > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Template values</p>
                      {Array.from({ length: neededParams }).map((_, i) => (
                        <Input
                          key={i}
                          aria-label={`Template value ${i + 1}`}
                          value={templateParams[i] || ""}
                          onChange={(e) =>
                            setTemplateParams((prev) => {
                              const next = [...prev];
                              next[i] = e.target.value;
                              return next;
                            })
                          }
                          placeholder={`Value for {{${i + 1}}}`}
                          disabled={busy}
                        />
                      ))}
                    </div>
                  ) : null}

                  {activeTemplate && templatePreview ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Preview</p>
                      <p className="whitespace-pre-wrap rounded-lg bg-[rgb(var(--color-muted))] p-3 text-sm">
                        {templatePreview}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="wa-body">
                    Message
                  </label>
                  <Textarea
                    id="wa-body"
                    rows={5}
                    maxLength={4096}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={busy}
                    placeholder="Write a retention message for this customer…"
                  />
                </div>
              )}
            </>
          ) : null}

          {phase === "sending" ? (
            <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--color-muted))] px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--color-primary))]" />
              Sending to WhatsApp…
            </div>
          ) : null}

          {sent && status ? (
            <DeliveryStatusPanel
              status={status}
              timestamps={statusTimestamps}
              providerMessageId={providerMessageId}
              errorMessage={errorMessage}
              webhookConfigured={webhookConfigured}
              pollingDone={pollingDone}
            />
          ) : null}

          {phase === "error" && errorMessage ? (
            <div className="flex items-start gap-2 rounded-lg border border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.08)] px-3 py-2 text-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-danger))]" />
              <div>
                <p className="font-medium">Message not sent</p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{errorMessage}</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {sent ? "Close" : "Cancel"}
          </Button>
          {phase === "error" ? (
            <Button onClick={() => setPhase("compose")}>Edit and retry</Button>
          ) : !sent ? (
            <Button onClick={handleSend} loading={busy} disabled={!canSend}>
              {busy ? "Sending…" : "Send"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryStatusPanel({
  status,
  timestamps,
  providerMessageId,
  errorMessage,
  webhookConfigured,
  pollingDone,
}: {
  status: DeliveryStatus;
  timestamps: Record<string, string>;
  providerMessageId: string | null;
  errorMessage: string | null;
  webhookConfigured: boolean;
  pollingDone: boolean;
}) {
  if (status === "DEMO") {
    return (
      <div className="rounded-lg border border-[rgb(var(--color-border))] p-3 text-sm">
        <p className="font-medium">Demo recorded</p>
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
          Not sent through WhatsApp Business Messaging. No delivery status is available.
        </p>
      </div>
    );
  }

  const failed = status === "FAILED";
  const reached = failed ? -1 : RANK[status] ?? 0;

  return (
    <div
      className={`space-y-3 rounded-xl border p-4 text-sm ${
        failed
          ? "border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.06)]"
          : "border-[rgb(var(--color-success)/0.35)] bg-[rgb(var(--color-success)/0.06)]"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {failed ? (
            <XCircle className="h-5 w-5 text-[rgb(var(--color-danger))]" />
          ) : status === "READ" ? (
            <CheckCheck className="h-5 w-5 text-[rgb(37,211,102)]" />
          ) : status === "QUEUED" ? (
            <Clock className="h-5 w-5 text-[rgb(var(--color-success))]" />
          ) : (
            <Check className="h-5 w-5 text-[rgb(var(--color-success))]" />
          )}
          <p className="font-semibold">{statusHeadline(status)}</p>
        </div>
        <Badge variant={failed ? "danger" : status === "QUEUED" ? "primary" : "success"} className="text-[0.65rem]">
          {status}
        </Badge>
      </div>

      {failed ? (
        <p className="text-xs">{errorMessage || "WhatsApp could not deliver this message."}</p>
      ) : (
        <ol className="grid grid-cols-4 gap-1">
          {STEPS.map((step, i) => {
            const done = i <= reached;
            return (
              <li key={step.status} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    done ? "bg-[rgb(var(--color-success))]" : "bg-[rgb(var(--color-border))]"
                  }`}
                />
                <p className={`text-[0.7rem] ${done ? "font-medium" : "text-[rgb(var(--color-muted-foreground))]"}`}>
                  {step.label}
                </p>
                {done && formatTime(timestamps[step.status]) ? (
                  <p className="text-[0.65rem] tabular-nums text-[rgb(var(--color-muted-foreground))]">
                    {formatTime(timestamps[step.status])}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {!failed && status !== "READ" ? (
        <p className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
          {!webhookConfigured ? (
            "Delivery receipts aren’t configured for this workspace, so updates beyond “Accepted” can’t be confirmed."
          ) : pollingDone ? (
            "Further delivery updates will appear in the customer’s activity timeline."
          ) : (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for WhatsApp delivery confirmation…
            </>
          )}
        </p>
      ) : null}

      {providerMessageId ? (
        <p className="break-all text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
          Message ID: {providerMessageId}
        </p>
      ) : null}
    </div>
  );
}
