"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button, Input, Field, Card, CardContent, Logo } from "@doloyal/ui";
import { api } from "@/lib/api";
import { ROLE_LABELS } from "@doloyal/shared";

type InviteInfo = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  businessName: string;
  expiresAt: string;
};

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [info, setInfo] = React.useState<InviteInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [invalid, setInvalid] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.getInvitationForAccept(token);
        setInfo(res);
        setFirstName(res.firstName ?? "");
        setLastName(res.lastName ?? "");
        setPhone(res.phone ?? "");
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    try {
      setSubmitting(true);
      await api.acceptInvitation(token, { password, firstName, lastName, phone });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[rgb(var(--color-background))] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center">
          <Logo size={36} />
          <h1 className="mt-6 text-center text-xl font-semibold tracking-tight">
            {loading ? "Loading invitation..." : info ? `Join ${info.businessName}` : "Invitation"}
          </h1>
          <p className="mt-1.5 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
            {loading
              ? "Fetching your invitation..."
              : info
                ? `You've been invited as ${ROLE_LABELS[info.role as keyof typeof ROLE_LABELS] ?? info.role}`
                : "This invitation link is being checked."}
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--color-muted-foreground))]" />
            </CardContent>
          </Card>
        ) : invalid ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))]">
                <XCircle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[rgb(var(--color-foreground))]">Invitation not found</h2>
              <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                This link may be invalid or expired. Ask the owner to send a new invitation.
              </p>
            </CardContent>
          </Card>
        ) : done ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[rgb(var(--color-foreground))]">You're in!</h2>
              <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                Your account is ready. Sign in to continue to your workspace.
              </p>
              <Link href="/sign-in" className="mt-5">
                <Button>
                  Go to sign in <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3">
                  <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-foreground))]">
                    <Mail className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                    {info?.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name">
                    <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>
                </div>

                <Field label="Phone (optional)">
                  <Input placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>

                <Field label="Create password" required>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                <Field label="Confirm password" required>
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </Field>

                {error && (
                  <div className="rounded-[var(--radius)] border border-[rgb(var(--color-danger)/0.3)] bg-[rgb(var(--color-danger)/0.08)] px-3 py-2 text-sm text-[rgb(var(--color-danger))]">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={submitting}>
                  <Lock className="mr-1.5 h-4 w-4" /> Accept invitation
                </Button>
                <p className="text-center text-xs text-[rgb(var(--color-muted-foreground))]">
                  {info && <span>Invitation expires {new Date(info.expiresAt).toLocaleDateString()}</span>}
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
          Powered by <span className="font-medium">Doloyal</span>
        </p>
      </motion.div>
    </div>
  );
}