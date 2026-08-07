import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TaskCardSkeleton } from "../TaskCardSkeleton";

describe("TaskCardSkeleton", () => {
  it("renders skeleton placeholders", () => {
    const { container } = render(<TaskCardSkeleton />);
    // The skeleton renders multiple animated divs
    const animated = container.querySelectorAll(".animate-pulse");
    expect(animated.length).toBeGreaterThan(0);
  });

  it("renders a rectangular progress bar skeleton", () => {
    const { container } = render(<TaskCardSkeleton />);
    const rectangular = container.querySelectorAll(".rounded-xl");
    expect(rectangular.length).toBeGreaterThan(0);
  });
});
