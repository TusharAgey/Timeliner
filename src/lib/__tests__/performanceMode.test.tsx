import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PERFORMANCE_MODE_ATTRIBUTE,
  PERFORMANCE_MODE_STORAGE_KEY,
  applyPerformanceMode,
  getPreferredPerformanceMode,
  usePerformanceMode,
} from "../performanceMode";

const mockReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("performanceMode", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(PERFORMANCE_MODE_ATTRIBUTE);
    mockReducedMotion(false);
  });

  it("defaults to full mode when no preference is stored", () => {
    expect(getPreferredPerformanceMode()).toBe("full");
  });

  it("uses optimized mode for reduced-motion users without stored preference", () => {
    mockReducedMotion(true);

    expect(getPreferredPerformanceMode()).toBe("optimized");
  });

  it("lets stored preference override reduced-motion defaults", () => {
    mockReducedMotion(true);
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, "full");

    expect(getPreferredPerformanceMode()).toBe("full");
  });

  it("applies optimized mode to the document element", () => {
    applyPerformanceMode("optimized");

    expect(document.documentElement).toHaveAttribute(
      PERFORMANCE_MODE_ATTRIBUTE,
      "optimized",
    );
  });

  it("persists and toggles optimized mode from the hook", () => {
    const { result } = renderHook(() => usePerformanceMode());

    expect(result.current.optimized).toBe(false);
    expect(document.documentElement).toHaveAttribute(
      PERFORMANCE_MODE_ATTRIBUTE,
      "full",
    );

    act(() => result.current.toggleMode());

    expect(result.current.optimized).toBe(true);
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe(
      "optimized",
    );
    expect(document.documentElement).toHaveAttribute(
      PERFORMANCE_MODE_ATTRIBUTE,
      "optimized",
    );
  });
});
