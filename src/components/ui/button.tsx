import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The prototype's Button had four variants and no size prop, so every call
 * site overrode padding by hand (`className="px-5 py-2.5"`). Sizes are part
 * of the component now.
 */

export type ButtonVariant = "primary" | "outline" | "ghost" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "whitespace-nowrap transition-all duration-300 ease-editorial " +
  "disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  // Brushed metal rather than flat gold — the ramp carries a specular
  // highlight and a sheen sweeps across it on hover.
  primary: "metal-fill shadow-glow-gold hover:shadow-glow-gold-lg",
  outline:
    "border border-gold/40 text-gold hover:border-gold hover:bg-gold/10 active:bg-gold/15",
  ghost: "text-cream/80 hover:text-gold",
  subtle:
    "border border-line bg-surface-3 text-cream hover:border-line-strong hover:bg-surface-4",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs tracking-wide",
  md: "px-6 py-3 text-sm tracking-wide",
  lg: "px-8 py-4 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/** A link styled as a button — keeps navigation crawlable and keyboard-native. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}
