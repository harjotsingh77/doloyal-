"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button, Input, Card, CardContent, Logo } from "@doloyal/ui";
import { useAuth, DEMO_MODE } from "@/lib/auth";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SignInPage() {
  const { login, loginWithGoogle, demoLogin, isLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error") || params.get("auth");
    if (err) {
      const messages: Record<string, string> = {
        access_denied: "Google sign-in was cancelled or declined.",
        auth_failed: "Google sign-in could not be completed. Please try again.",
        error: "Google sign-in could not be completed. Please try again.",
      };
      setError(messages[err] || "Google sign-in could not be completed. Please try again.");
    }
  }, []);

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
          <h1 className="mt-6 text-xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[rgb(var(--color-muted-foreground))]">
            Sign in to your doloyal AI account
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
                  <Input id="email" type="email" placeholder="demo@doloyal.ai" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
                  <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>

              {error && <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>}

              <Button type="submit" className="w-full" loading={isLoading}>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgb(var(--color-border))]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[rgb(var(--color-surface))] px-2 text-[rgb(var(--color-muted-foreground))]">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle()}
              disabled={isLoading}
              className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md hover:border-slate-300 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700 disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </button>

            <div className="mt-4">
              {DEMO_MODE && (
                <Button variant="ghost" className="w-full text-sm text-[rgb(var(--color-primary))]" onClick={demoLogin} loading={isLoading}>
                  Demo Login (skip auth)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
