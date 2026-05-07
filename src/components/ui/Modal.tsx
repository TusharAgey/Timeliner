import type { PropsWithChildren } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}>;

export const Modal = ({
  open,
  title,
  description,
  onClose,
  children,
}: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-[28px] bg-[#0d1726]/96 p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full p-2"
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};
