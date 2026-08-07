import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DependencyGraphView } from "../DependencyGraphView";
import type { Project } from "../../../models/types";

const makeTask = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Project 1",
  slug: "project-1",
  description: "",
  milestones: [],
  tasks: [makeTask()],
  ...overrides,
});

describe("DependencyGraphView", () => {
  it("renders the heading and stats", () => {
    render(
      <DependencyGraphView projects={[makeProject()]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Dependency graph")).toBeInTheDocument();
    expect(screen.getByText("nodes")).toBeInTheDocument();
    expect(screen.getByText("edges")).toBeInTheDocument();
  });

  it("shows the empty state when there are no tasks with dependencies", () => {
    render(
      <DependencyGraphView
        projects={[makeProject({ tasks: [] })]}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText((content) =>
        content.replace(/\s+/g, " ").includes("No tasks with dependencies"),
      ),
    ).toBeInTheDocument();
  });

  it("renders nodes when tasks have dependencies", () => {
    const project = makeProject({
      tasks: [
        makeTask({ id: "task-1", title: "Setup infra" }),
        makeTask({
          id: "task-2",
          title: "Build API",
          dependencies: ["task-1"],
        }),
      ],
    });
    render(<DependencyGraphView projects={[project]} onClose={vi.fn()} />);
    expect(screen.queryByText(/No tasks with dependencies found/i)).toBeNull();
    expect(screen.getByText("Setup infra")).toBeInTheDocument();
    expect(screen.getByText("Build API")).toBeInTheDocument();
  });

  it("calls onClose when the back button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <DependencyGraphView projects={[makeProject()]} onClose={onClose} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Back to timeline/i }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("zooms in and out with the zoom buttons", async () => {
    render(
      <DependencyGraphView projects={[makeProject()]} onClose={vi.fn()} />,
    );
    const zoomIn = screen.getByRole("button", { name: /Zoom in/i });
    const zoomOut = screen.getByRole("button", { name: /Zoom out/i });
    await userEvent.click(zoomIn);
    expect(screen.getByText("120%")).toBeInTheDocument();
    await userEvent.click(zoomOut);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("resets the view with the reset button", async () => {
    render(
      <DependencyGraphView projects={[makeProject()]} onClose={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Zoom in/i }));
    expect(screen.getByText("120%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reset view/i }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows the critical path badge when present", () => {
    const project = makeProject({
      tasks: [
        makeTask({ id: "task-1", title: "Setup infra" }),
        makeTask({
          id: "task-2",
          title: "Build API",
          dependencies: ["task-1"],
        }),
      ],
    });
    render(<DependencyGraphView projects={[project]} onClose={vi.fn()} />);
    expect(screen.getByText(/Critical path:/i)).toBeInTheDocument();
  });
});
