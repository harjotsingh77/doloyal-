"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 py-2 text-sm text-[rgb(var(--color-foreground))] shadow-sm transition-colors",
        "placeholder:text-[rgb(var(--color-subtle))]",
        "focus-visible:outline-none focus-visible:border-[rgb(var(--color-primary))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary)/0.25)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[88px] w-full rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 py-2.5 text-sm text-[rgb(var(--color-foreground))] shadow-sm transition-colors",
        "placeholder:text-[rgb(var(--color-subtle))]",
        "focus-visible:outline-none focus-visible:border-[rgb(var(--color-primary))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary)/0.25)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none text-[rgb(var(--color-foreground))]",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Form field wrapper that pairs a Label, control, hint, and error. */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-[rgb(var(--color-danger))]">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-[rgb(var(--color-danger))]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{hint}</p>
      ) : null}
    </div>
  );
}
