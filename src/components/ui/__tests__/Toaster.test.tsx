import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Toaster } from "../Toaster";

describe("Toaster", () => {
  it("renders the sonner toaster", () => {
    const { container } = render(<Toaster />);
    // Sonner renders a section with role="region" and aria-label
    expect(container.querySelector("section")).toBeInTheDocument();
  });
});
