import { useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { themes, getTheme } from "../../themes/themeConfig";
import type { ThemeId } from "../../themes/themeConfig";
import { cn } from "../../lib/utils";

type ThemeSwitcherProps = {
  current: ThemeId;
  onChange: (theme: ThemeId) => void;
};

export const ThemeSwitcher = ({ current, onChange }: ThemeSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const currentTheme = getTheme(current);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-2 text-sm text-slate-400 ring-1 ring-white/8 transition hover:bg-white/10 hover:text-slate-200"
        title="Switch theme"
      >
        <Palette className="size-4" />
        <span className="hidden text-xs sm:inline">{currentTheme.icon}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 min-w-64 rounded-2xl bg-[#0d1726]/98 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl">
          <div className="mb-1 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Theme
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {themes.map((theme) => {
              const isActive = current === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onChange(theme.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl px-3 py-2.5 text-left transition",
                    isActive
                      ? "bg-white/10 ring-1 ring-white/15"
                      : "hover:bg-white/6",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{theme.icon}</span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-white" : "text-slate-300",
                      )}
                    >
                      {theme.name}
                    </span>
                    {isActive ? (
                      <span className="ml-auto size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--glow-color)]" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Mini color swatches */}
                    <span
                      className="inline-block size-3 rounded-full ring-1 ring-white/10"
                      style={{ backgroundColor: theme.bg }}
                    />
                    <span
                      className="inline-block size-3 rounded-full ring-1 ring-white/10"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {theme.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
