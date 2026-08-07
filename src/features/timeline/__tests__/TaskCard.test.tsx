import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "../TaskCard";
import type { Milestone, Task, Person } from "../../../models/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Design login page",
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

const people: Person[] = [
  { id: "p1", name: "Alice", role: "Developer" },
  { id: "p2", name: "Bob", role: "Manager" },
];

const milestones: Milestone[] = [];

describe("TaskCard", () => {
  it("renders the task title", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Design login page")).toBeInTheDocument();
  });

  it("renders the assignee name", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders the accountable person", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders the status badge", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // Status is computed dynamically; with May 1-15 dates and 50% progress on June 3, it's "Overdue"
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders the progress percentage", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("renders the date range", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/May 1.*May 15/)).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );
    const deleteButton = screen.getByRole("button", { name: /delete task/i });
    await userEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith("task-1");
  });

  it("shows edit inline button", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit inline")).toBeInTheDocument();
  });

  it("shows details button", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows +10% and +1d quick action buttons", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("+10%")).toBeInTheDocument();
    expect(screen.getByText("+1d")).toBeInTheDocument();
  });

  it("calls onSave with increased progress when +10% is clicked", async () => {
    const onSave = vi.fn();
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("+10%"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ progressPercent: 60 }),
    );
  });

  it("calls onSave with shifted dates when +1d is clicked", async () => {
    const onSave = vi.fn();
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("+1d"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-05-02",
        endDate: "2026-05-16",
      }),
    );
  });

  it("has an accessible role and label", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const articles = screen.getAllByRole("button", {
      name: /task: design login page/i,
    });
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0]).toBeInTheDocument();
  });

  it("shows handoff count when there are previous assignees", () => {
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
    render(
      <TaskCard
        task={task}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/handoff/)).toBeInTheDocument();
  });

  it("shows 'No Jira' when no Jira link is present", () => {
    render(
      <TaskCard
        task={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("No Jira")).toBeInTheDocument();
  });

  it("shows Jira link when present", () => {
    const task = makeTask({ jiraLink: "https://jira.local/browse/PROJ-123" });
    render(
      <TaskCard
        task={task}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Jira")).toBeInTheDocument();
  });
});
