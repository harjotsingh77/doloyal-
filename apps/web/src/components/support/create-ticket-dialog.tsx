"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Paperclip,
  Ticket,
  X,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Field,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "@doloyal/ui";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_PRIORITY_LABELS } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
  onCreated?: (ticket: { id: string; ticketNumber: string }) => void;
}

type Errors = Partial<Record<"subject" | "category" | "description", string>>;

export function CreateTicketDialog({
  open,
  onOpenChange,
  defaultCategory,
  onCreated,
}: CreateTicketDialogProps) {
  const router = useRouter();
  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState(defaultCategory ?? "");
  const [priority, setPriority] = React.useState("NORMAL");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<{
    id: string;
    ticketNumber: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setSubject("");
      setCategory(defaultCategory ?? "");
      setPriority("NORMAL");
      setDescription("");
      setFile(null);
      setErrors({});
      setCreated(null);
    }
  }, [open, defaultCategory]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!subject.trim()) next.subject = "Please enter a subject.";
    if (!category) next.category = "Please select a category.";
    if (!description.trim()) next.description = "Please describe your issue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const ticket = await api.createSupportTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      });
      if (file) {
        try {
          await api.uploadSupportTicketFile(ticket.id, file);
        } catch {
          // Attachment is optional — ticket still created.
        }
      }
      setCreated({ id: ticket.id, ticketNumber: ticket.ticketNumber });
      onCreated?.(ticket);
      toast.success("Support ticket created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong creating your ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openConversation = () => {
    if (!created) return;
    onOpenChange(false);
    router.push(`/app/help/tickets/${created.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle>Ticket Created</DialogTitle>
            <DialogDescription className="mt-1">
              Your support request has been received.
            </DialogDescription>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-4 py-3">
              <Ticket className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              <span className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                {created.ticketNumber}
              </span>
              <Badge variant="success" dot>
                Open
              </Badge>
            </div>
            <Button className="mt-6 w-full" onClick={openConversation}>
              Open Conversation <span aria-hidden>→</span>
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create a Support Ticket</DialogTitle>
              <DialogDescription>
                Tell us what you need help with and we&apos;ll get back to you here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Field label="Subject" required error={errors.subject} htmlFor="ticket-subject">
                <Input
                  id="ticket-subject"
                  placeholder="e.g. Can't send campaigns"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (errors.subject) setErrors((p) => ({ ...p, subject: undefined }));
                  }}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" required error={errors.category}>
                  <Select
                    value={category}
                    onValueChange={(v) => {
                      setCategory(v);
                      if (errors.category) setErrors((p) => ({ ...p, category: undefined }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Priority">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {SUPPORT_PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Description" required error={errors.description} htmlFor="ticket-description">
                <Textarea
                  id="ticket-description"
                  rows={5}
                  placeholder="Describe the issue, what you were trying to do, and what happened..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                  }}
                />
              </Field>

              <div>
                <input
                  type="file"
                  id="ticket-attachment"
                  className="hidden"
                  onChange={pickFile}
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                />
                {file ? (
                  <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
                      <span className="truncate text-xs text-[rgb(var(--color-foreground))]">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="ticket-attachment"
                    className="flex cursor-pointer items-center gap-2 text-sm text-[rgb(var(--color-primary))] hover:underline"
                  >
                    <Paperclip className="h-4 w-4" />
                    Upload screenshot, image, PDF, or relevant file (optional)
                  </label>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button loading={submitting} onClick={() => void submit()}>
                {submitting ? "Creating ticket..." : "Submit Ticket →"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}