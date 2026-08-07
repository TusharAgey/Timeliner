import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MilestoneModal } from "../MilestoneModal";
import type { Project } from "../../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Project 1",
  slug: "project-1",
  description: "",
  milestones: [
    {
      id: "ms-1",
      title: "Launch",
      date: "2026-06-01",
      description: "Ship it",
      color: "bg-cyan-400",
    },
  ],
  tasks: [],
  ...overrides,
});

describe("MilestoneModal", () => {
  it("renders the milestone list", () => {
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveMilestone={vi.fn()}
        onDeleteMilestone={vi.fn()}
      />,
    );
    expect(screen.getByText("Launch")).toBeInTheDocument();
  });

  it("adds a milestone", async () => {
    const onSaveMilestone = vi.fn();
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveMilestone={onSaveMilestone}
        onDeleteMilestone={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText("Milestone title"), "Beta");
    await userEvent.type(screen.getByLabelText("Milestone date"), "2026-07-01");
    await userEvent.click(screen.getByRole("button", { name: /Add/i }));
    expect(onSaveMilestone).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({ title: "Beta", date: "2026-07-01" }),
    );
  });

  it("does not add a milestone without a title", async () => {
    const onSaveMilestone = vi.fn();
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveMilestone={onSaveMilestone}
        onDeleteMilestone={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Add/i }));
    expect(onSaveMilestone).not.toHaveBeenCalled();
  });

  it("edits a milestone", async () => {
    const onSaveMilestone = vi.fn();
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveMilestone={onSaveMilestone}
        onDeleteMilestone={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText("Edit Launch"));
    const titleInput = screen.getByLabelText("Edit milestone title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Launch v2");
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSaveMilestone).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({ title: "Launch v2" }),
    );
  });

  it("deletes a milestone after confirmation", async () => {
    const onDeleteMilestone = vi.fn();
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveMilestone={vi.fn()}
        onDeleteMilestone={onDeleteMilestone}
      />,
    );
    await userEvent.click(screen.getByLabelText("Delete Launch"));
    await userEvent.click(screen.getByRole("button", { name: /Yes, delete/i }));
    expect(onDeleteMilestone).toHaveBeenCalledWith("proj-1", "ms-1");
  });

  it("shows the empty state when there are no milestones", () => {
    render(
      <MilestoneModal
        open={true}
        projects={[makeProject({ milestones: [] })]}
        onClose={vi.fn()}
        onSaveMilestone={vi.fn()}
        onDeleteMilestone={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No milestones yet. Add your first milestone above."),
    ).toBeInTheDocument();
  });

  it("returns null when there are no projects", () => {
    const { container } = render(
      <MilestoneModal
        open={true}
        projects={[]}
        onClose={vi.fn()}
        onSaveMilestone={vi.fn()}
        onDeleteMilestone={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
