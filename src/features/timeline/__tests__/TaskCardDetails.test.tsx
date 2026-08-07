import { describe, it, expect } from "vitest";

import { render, screen } from "@testing-library/react";
import { TaskCardDetails } from "../TaskCardDetails";
import type { Task } from "../../../models/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Design login page",
  description: "A detailed description",
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
  priority: "High" as const,
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

describe("TaskCardDetails", () => {
  it("renders the task description", () => {
    render(<TaskCardDetails task={makeTask()} handoffCount={0} />);
    expect(screen.getByText("A detailed description")).toBeInTheDocument();
  });

  it("shows a fallback when there is no description", () => {
    render(
      <TaskCardDetails task={makeTask({ description: "" })} handoffCount={0} />,
    );
    expect(screen.getByText("No description yet.")).toBeInTheDocument();
  });

  it("renders intra-project dependencies with assignee names", () => {
    const dep = makeTask({
      id: "dep-1",
      title: "Setup infra",
      assignees: [
        {
          name: "Carol",
          role: "responsible" as const,
          from: "2026-01-01",
          to: null,
        },
      ],
    });
    const task = makeTask({ dependencies: ["dep-1"] });
    render(<TaskCardDetails task={task} handoffCount={0} allTasks={[dep]} />);
    expect(screen.getByText("Depends on")).toBeInTheDocument();
    expect(screen.getByText("Setup infra")).toBeInTheDocument();
    expect(screen.getByText(/Carol/)).toBeInTheDocument();
  });

  it("renders ownership history when handoffCount is present", () => {
    const task = makeTask({
      assignees: [
        {
          name: "Charlie",
          role: "responsible" as const,
          from: "2026-01-01",
          to: "2026-02-01",
        },
        {
          name: "Alice",
          role: "responsible" as const,
          from: "2026-02-01",
          to: null,
        },
      ],
    });
    render(<TaskCardDetails task={task} handoffCount={1} />);
    expect(screen.getByText("Ownership history")).toBeInTheDocument();
    expect(screen.getByText(/Responsible — Charlie/)).toBeInTheDocument();
    expect(screen.getByText(/Responsible — Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Accountable — Bob/)).toBeInTheDocument();
  });

  it("does not render ownership history when handoffCount is zero", () => {
    render(<TaskCardDetails task={makeTask()} handoffCount={0} />);
    expect(screen.queryByText("Ownership history")).not.toBeInTheDocument();
  });

  it("renders cross-project dependencies", () => {
    const task = makeTask({
      crossProjectDependencies: [
        { taskId: "ext-1", projectId: "proj-x", label: "External task" },
      ],
    });
    render(<TaskCardDetails task={task} handoffCount={0} />);
    expect(screen.getByText("Cross-project dependencies")).toBeInTheDocument();
    expect(screen.getByText("External task")).toBeInTheDocument();
  });

  it("renders activity log entries", () => {
    const task = makeTask({
      activityLog: [
        {
          id: "log-1",
          actor: "Alice",
          action: "updated",
          field: "status",
          timestamp: "2026-05-01T10:00:00.000Z",
        },
      ],
    });
    render(<TaskCardDetails task={task} handoffCount={0} />);
    expect(screen.getByText("Activity log")).toBeInTheDocument();
    expect(screen.getByText(/Alice updated status/)).toBeInTheDocument();
  });

  it("renders activity log entries without a timestamp", () => {
    const task = makeTask({
      activityLog: [
        {
          id: "log-2",
          actor: "Bob",
          action: "created",
          field: "",
          timestamp: "",
        },
      ],
    });
    render(<TaskCardDetails task={task} handoffCount={0} />);
    expect(screen.getByText(/Bob created/)).toBeInTheDocument();
  });
});
