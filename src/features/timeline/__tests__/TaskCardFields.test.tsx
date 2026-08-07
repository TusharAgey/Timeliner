import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditFields, Field } from "../TaskCardFields";

import type { Milestone, Person, Task } from "../../../models/types";

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

const milestones: Milestone[] = [
  {
    id: "ms-1",
    title: "Launch",
    date: "2026-06-01",
    description: "",
    color: "",
  },
];

describe("Field", () => {
  it("renders a label and children", () => {
    render(
      <Field label="Task Title">
        <input />
      </Field>,
    );
    expect(screen.getByText("Task Title")).toBeInTheDocument();
  });
});

describe("EditFields", () => {
  it("renders the task title input", () => {
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Design login page")).toBeInTheDocument();
  });

  it("calls onChange when the title is edited", async () => {
    const onChange = vi.fn();
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={onChange}
      />,
    );
    const titleInput = screen.getByDisplayValue("Design login page");
    fireEvent.change(titleInput, { target: { value: "New title" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New title" }),
    );
  });

  it("renders the milestone selector with options", () => {
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Select milestone");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("No milestone")).toBeInTheDocument();
    expect(screen.getByText(/Launch/)).toBeInTheDocument();
  });

  it("renders the progress slider", () => {
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Progress percentage")).toBeInTheDocument();
  });

  it("renders the description textarea", () => {
    render(
      <EditFields
        draft={makeTask({ description: "A description" })}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("A description")).toBeInTheDocument();
  });

  it("shows selected dependencies as chips", () => {
    const dep = makeTask({ id: "dep-1", title: "Setup infra" });
    render(
      <EditFields
        draft={makeTask({ dependencies: ["dep-1"] })}
        people={people}
        milestones={milestones}
        allTasks={[dep]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Setup infra")).toBeInTheDocument();
  });

  it("opens the dependency dropdown and adds a dependency", async () => {
    const onChange = vi.fn();
    const dep = makeTask({ id: "dep-1", title: "Setup infra" });
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[dep]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByText("Select dependencies…"));
    await userEvent.click(screen.getByText("Setup infra"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dependencies: ["dep-1"] }),
    );
  });

  it("removes a dependency via its remove button", async () => {
    const onChange = vi.fn();
    const dep = makeTask({ id: "dep-1", title: "Setup infra" });
    render(
      <EditFields
        draft={makeTask({ dependencies: ["dep-1"] })}
        people={people}
        milestones={milestones}
        allTasks={[dep]}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByLabelText("Remove dependency: Setup infra"),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dependencies: [] }),
    );
  });

  it("shows 'All tasks are already dependencies' when no tasks are available", async () => {
    render(
      <EditFields
        draft={makeTask()}
        people={people}
        milestones={milestones}
        allTasks={[]}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Select dependencies…"));
    expect(
      screen.getByText("All tasks are already dependencies"),
    ).toBeInTheDocument();
  });
});
