import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }
>;

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-white shadow-[0_10px_30px_rgba(124,58,237,0.32)] hover:bg-violet-500",
  secondary: "bg-white/6 text-slate-200 hover:bg-white/10",
  ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-text",
  danger: "bg-danger/85 text-white hover:bg-danger",
};

export const Button = ({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
      variants[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
