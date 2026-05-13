import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState
        icon={<span>🔍</span>}
        title="No tasks found"
        description="Try adding a new task."
      />,
    );
    expect(screen.getByText("No tasks found")).toBeInTheDocument();
    expect(screen.getByText("Try adding a new task.")).toBeInTheDocument();
  });

  it("renders the action button when provided", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<span>📋</span>}
        title="No results"
        description="Create your first task"
        action={{ label: "Add Task", onClick }}
      />,
    );
    const button = screen.getByRole("button", { name: "Add Task" });
    expect(button).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render a button when no action is provided", () => {
    render(
      <EmptyState
        icon={<span>📋</span>}
        title="Empty"
        description="Nothing here"
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
