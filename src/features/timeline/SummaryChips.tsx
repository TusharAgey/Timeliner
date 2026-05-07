type SummaryChip = {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warning" | "accent";
  filter?: string;
};

type SummaryChipsProps = {
  chips: SummaryChip[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
};

const toneClasses: Record<NonNullable<SummaryChip["tone"]>, string> = {
  default: "text-slate-300 bg-white/[0.04]",
  danger: "text-rose-200 bg-rose-500/10",
  warning: "text-amber-200 bg-amber-500/10",
  accent: "text-cyan-200 bg-cyan-500/10",
};

export const SummaryChips = ({
  chips,
  activeFilter = "all",
  onFilterChange,
}: SummaryChipsProps) => (
  <div className="flex flex-wrap gap-2">
    {chips.map((chip) => {
      const filter = chip.filter ?? "all";
      const selected = activeFilter === filter;
      return (
        <button
          key={chip.label}
          onClick={() => onFilterChange?.(selected ? "all" : filter)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 transition hover:-translate-y-0.5 hover:ring-white/16 ${selected ? "ring-cyan-300/40 shadow-[0_0_18px_rgba(34,211,238,0.12)]" : "ring-white/6"} ${toneClasses[chip.tone ?? "default"]}`}
        >
          <span className="font-semibold text-white">{chip.value}</span>
          <span className="text-xs uppercase tracking-[0.16em] opacity-80">
            {chip.label}
          </span>
        </button>
      );
    })}
  </div>
);
