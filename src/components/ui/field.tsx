import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Form primitives.
 *
 * The prototype copy-pasted this exact input class string into five separate
 * files, with two more near-identical variants. One definition now.
 */

export const controlStyles =
  "w-full rounded-md border border-line bg-ink/60 px-4 py-3 text-sm text-cream " +
  "transition-colors outline-none placeholder:text-muted-dim " +
  "hover:border-line-strong focus:border-gold/60 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/* ---------------------------------- field --------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted"
      >
        {label}
        {required ? <span className="ml-1 text-gold">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-dim">{hint}</p>
      ) : null}
    </div>
  );
}

/* --------------------------------- controls -------------------------------- */

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, className)} {...rest} />;
}

export function Textarea({
  className,
  rows = 5,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={rows} className={cn(controlStyles, "resize-y", className)} {...rest} />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlStyles,
        "cursor-pointer appearance-none bg-surface-2",
        // room for the chevron drawn by the caller
        "pr-10",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
