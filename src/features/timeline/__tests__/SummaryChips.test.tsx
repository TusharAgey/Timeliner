import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SummaryChips } from "../SummaryChips";

const chips = [
  { label: "All", value: "12" },
  { label: "Overdue", value: "3", tone: "danger" as const, filter: "overdue" },
  { label: "At Risk", value: "2", tone: "warning" as const, filter: "at-risk" },
];

describe("SummaryChips", () => {
  it("renders all chips with labels and values", () => {
    render(<SummaryChips chips={chips} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("At Risk")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onFilterChange with the chip filter when clicked", async () => {
    const onFilterChange = vi.fn();
    render(<SummaryChips chips={chips} onFilterChange={onFilterChange} />);
    await userEvent.click(screen.getByText("Overdue"));
    expect(onFilterChange).toHaveBeenCalledWith("overdue");
  });

  it("calls onFilterChange with 'all' when an active chip is clicked again", async () => {
    const onFilterChange = vi.fn();
    render(
      <SummaryChips
        chips={chips}
        activeFilter="overdue"
        onFilterChange={onFilterChange}
      />,
    );
    await userEvent.click(screen.getByText("Overdue"));
    expect(onFilterChange).toHaveBeenCalledWith("all");
  });

  it("does not call onFilterChange when no handler is provided", async () => {
    render(<SummaryChips chips={chips} />);
    await userEvent.click(screen.getByText("Overdue"));
    // No crash and no handler to call
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("marks the active chip as selected", () => {
    render(<SummaryChips chips={chips} activeFilter="overdue" />);
    const overdueButton = screen.getByText("Overdue").closest("button");
    expect(overdueButton!.className).toContain("ring-cyan-300/40");
  });
});
