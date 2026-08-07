import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZoomControls } from "../ZoomControls";

describe("ZoomControls", () => {
  it("renders all zoom options", () => {
    render(<ZoomControls value="week" onChange={vi.fn()} />);
    expect(screen.getByText("week")).toBeInTheDocument();
    expect(screen.getByText("month")).toBeInTheDocument();
    expect(screen.getByText("quarter")).toBeInTheDocument();
  });

  it("calls onChange with the selected option", async () => {
    const onChange = vi.fn();
    render(<ZoomControls value="week" onChange={onChange} />);
    await userEvent.click(screen.getByText("month"));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("marks the active option as selected", () => {
    render(<ZoomControls value="quarter" onChange={vi.fn()} />);
    const quarterButton = screen.getByText("quarter");
    expect(quarterButton.className).toContain("bg-white/10");
  });
});
