import { useCallback, useEffect, useState } from "react";

export type PerformanceMode = "full" | "optimized";

export const PERFORMANCE_MODE_STORAGE_KEY = "timeliner-performance-mode";
export const PERFORMANCE_MODE_ATTRIBUTE = "data-performance-mode";

const isPerformanceMode = (value: string | null): value is PerformanceMode =>
  value === "full" || value === "optimized";

export const getPreferredPerformanceMode = (): PerformanceMode => {
  if (typeof window === "undefined") return "full";

  const stored = window.localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY);
  if (isPerformanceMode(stored)) return stored;

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "optimized"
    : "full";
};

export const applyPerformanceMode = (mode: PerformanceMode) => {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(PERFORMANCE_MODE_ATTRIBUTE, mode);
};

export const usePerformanceMode = () => {
  const [mode, setModeState] = useState<PerformanceMode>(() =>
    getPreferredPerformanceMode(),
  );

  useEffect(() => {
    applyPerformanceMode(mode);
    window.localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((nextMode: PerformanceMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === "optimized" ? "full" : "optimized"));
  }, []);

  return {
    mode,
    optimized: mode === "optimized",
    setMode,
    toggleMode,
  };
};
