import { cn } from "../../lib/utils";
import type { TimelineZoom } from "./timelineTypes";

type ZoomControlsProps = {
  value: TimelineZoom;
  onChange: (zoom: TimelineZoom) => void;
};

const options: TimelineZoom[] = ["week", "month", "quarter"];

export const ZoomControls = ({ value, onChange }: ZoomControlsProps) => (
  <div className="inline-flex rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/8">
    {options.map((option) => (
      <button
        key={option}
        onClick={() => onChange(option)}
        className={cn(
          "rounded-xl px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition",
          value === option
            ? "bg-white/10 text-white"
            : "text-slate-500 hover:text-slate-300",
        )}
      >
        {option}
      </button>
    ))}
  </div>
);
