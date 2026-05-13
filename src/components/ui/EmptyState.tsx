import type { ReactNode } from "react";
import { Button } from "./Button";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
    <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/8">
      <div className="text-slate-500">{icon}</div>
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm text-slate-400">{description}</p>
    {action ? (
      <Button onClick={action.onClick} className="mt-5">
        {action.label}
      </Button>
    ) : null}
  </div>
);
