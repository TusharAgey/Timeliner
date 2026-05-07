import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "w-full rounded-2xl bg-white/[0.045] px-4 py-2.5 text-sm text-text outline-none ring-1 ring-white/8 transition placeholder:text-muted focus:bg-white/[0.07] focus:ring-white/14",
      className,
    )}
    {...props}
  />
);

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "min-h-24 w-full rounded-2xl bg-white/[0.045] px-4 py-3 text-sm text-text outline-none ring-1 ring-white/8 transition placeholder:text-muted focus:bg-white/[0.07] focus:ring-white/14",
      className,
    )}
    {...props}
  />
);
