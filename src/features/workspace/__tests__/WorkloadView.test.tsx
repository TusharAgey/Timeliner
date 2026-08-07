import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkloadView } from "../WorkloadView";
import type { Project } from "../../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Project 1",
  slug: "project-1",
  description: "",
  milestones: [],
  tasks: [
    {
      id: "task-1",
      title: "Design login",
      description: "",
      assignees: [
        {
          name: "Alice",
          role: "responsible" as const,
          from: "2026-01-01",
          to: null,
        },
      ],
      accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
      jiraLink: "",
      deliverable: "",
      startDate: "2026-05-01",
      endDate: "2026-05-15",
      expectedStartDate: "2026-05-01",
      expectedEndDate: "2026-05-15",
      progressPercent: 50,
      priority: "Medium" as const,
      labels: [],
      blockedReason: "",
      milestoneId: "",
      dependencies: [],
      crossProjectDependencies: [],
      status: "On Track" as const,
      activityLog: [],
      isTemplate: false,
    },
  ],
  ...overrides,
});

describe("WorkloadView", () => {
  it("renders the workload heading", () => {
    render(
      <WorkloadView projects={[makeProject()]} people={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Workload view")).toBeInTheDocument();
  });

  it("groups tasks by assignee", () => {
    render(
      <WorkloadView projects={[makeProject()]} people={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Design login")).toBeInTheDocument();
  });

  it("shows the task count", () => {
    render(
      <WorkloadView projects={[makeProject()]} people={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("1 task")).toBeInTheDocument();
  });

  it("calls onClose when the back button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <WorkloadView projects={[makeProject()]} people={[]} onClose={onClose} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Back to timeline/i }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows overdue badge when a task is overdue", () => {
    const project = makeProject({
      tasks: [
        {
          id: "task-1",
          title: "Overdue task",
          description: "",
          assignees: [
            {
              name: "Alice",
              role: "responsible" as const,
              from: "2026-01-01",
              to: null,
            },
          ],
          accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
          jiraLink: "",
          deliverable: "",
          startDate: "2026-01-01",
          endDate: "2026-01-15",
          expectedStartDate: "2026-01-01",
          expectedEndDate: "2026-01-15",
          progressPercent: 10,
          priority: "Medium" as const,
          labels: [],
          blockedReason: "",
          milestoneId: "",
          dependencies: [],
          crossProjectDependencies: [],
          status: "Overdue" as const,
          activityLog: [],
          isTemplate: false,
        },
      ],
    });
    render(<WorkloadView projects={[project]} people={[]} onClose={vi.fn()} />);
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0);
  });

  it("renders an empty state when there are no tasks", () => {
    render(
      <WorkloadView
        projects={[makeProject({ tasks: [] })]}
        people={[]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Workload view")).toBeInTheDocument();
  });
});
