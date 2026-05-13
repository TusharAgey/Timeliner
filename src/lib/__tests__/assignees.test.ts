import { describe, it, expect } from "vitest";
import {
  makeAssigneeHistory,
  makeAccountableHistory,
  getAssigneeHistory,
  getCurrentAssignee,
  getCurrentAccountable,
  getPreviousAssignees,
  getPreviousAccountables,
  normalizeAssignees,
  reassignTask,
  reassignAccountable,
} from "../assignees";
import type { Task } from "../../models/types";

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test",
  description: "",
  assignees: [],
  accountable: [],
  jiraLink: "",
  deliverable: "",
  startDate: "2026-05-01",
  endDate: "2026-05-15",
  expectedStartDate: "2026-05-01",
  expectedEndDate: "2026-05-15",
  progressPercent: 0,
  priority: "Medium",
  labels: [],
  blockedReason: "",
  dependencies: [],
  crossProjectDependencies: [],
  status: "Not Started",
  activityLog: [],
  isTemplate: false,
  ...overrides,
});

describe("makeAssigneeHistory", () => {
  it("creates a single-entry history with default values", () => {
    const history = makeAssigneeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("Unassigned");
    expect(history[0].role).toBe("responsible");
    expect(history[0].to).toBeNull();
  });

  it("uses the provided name", () => {
    const history = makeAssigneeHistory("Alice");
    expect(history[0].name).toBe("Alice");
  });

  it("falls back to Unassigned for empty name", () => {
    const history = makeAssigneeHistory("");
    expect(history[0].name).toBe("Unassigned");
  });
});

describe("makeAccountableHistory", () => {
  it("creates a single-entry history with default values", () => {
    const history = makeAccountableHistory();
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("Unassigned");
    expect(history[0].to).toBeNull();
  });
});

describe("getAssigneeHistory", () => {
  it("returns assignees array when present", () => {
    const task = baseTask({
      assignees: [
        { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
      ],
    });
    const history = getAssigneeHistory(task);
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("Alice");
  });

  it("falls back to legacy assignee field", () => {
    const task = {
      ...baseTask(),
      assignee: "Bob",
    } as Task;
    const history = getAssigneeHistory(task);
    expect(history[0].name).toBe("Bob");
  });

  it("falls back to Unassigned when no assignee data exists", () => {
    const history = getAssigneeHistory(baseTask());
    expect(history[0].name).toBe("Unassigned");
  });
});

describe("getCurrentAssignee", () => {
  it("returns the name of the current (to === null) assignee", () => {
    const task = baseTask({
      assignees: [
        {
          name: "Alice",
          role: "responsible",
          from: "2026-01-01",
          to: "2026-03-01",
        },
        { name: "Bob", role: "responsible", from: "2026-03-01", to: null },
      ],
    });
    expect(getCurrentAssignee(task)).toBe("Bob");
  });

  it("returns Unassigned when no assignees", () => {
    expect(getCurrentAssignee(baseTask())).toBe("Unassigned");
  });
});

describe("getCurrentAccountable", () => {
  it("returns the name of the current accountable person", () => {
    const task = baseTask({
      accountable: [{ name: "Carol", from: "2026-01-01", to: null }],
    });
    expect(getCurrentAccountable(task)).toBe("Carol");
  });
});

describe("getPreviousAssignees", () => {
  it("returns only past assignees", () => {
    const task = baseTask({
      assignees: [
        {
          name: "Alice",
          role: "responsible",
          from: "2026-01-01",
          to: "2026-02-01",
        },
        { name: "Bob", role: "responsible", from: "2026-02-01", to: null },
      ],
    });
    const previous = getPreviousAssignees(task);
    expect(previous).toHaveLength(1);
    expect(previous[0].name).toBe("Alice");
  });
});

describe("getPreviousAccountables", () => {
  it("returns only past accountable persons", () => {
    const task = baseTask({
      accountable: [
        { name: "Carol", from: "2026-01-01", to: "2026-02-01" },
        { name: "Dave", from: "2026-02-01", to: null },
      ],
    });
    const previous = getPreviousAccountables(task);
    expect(previous).toHaveLength(1);
    expect(previous[0].name).toBe("Carol");
  });
});

describe("normalizeAssignees", () => {
  it("ensures assignees and accountable are populated", () => {
    const task = baseTask();
    const normalized = normalizeAssignees(task);
    expect(normalized.assignees.length).toBeGreaterThan(0);
    expect(normalized.accountable.length).toBeGreaterThan(0);
  });
});

describe("reassignTask", () => {
  it("adds a new entry when reassigning to a different person", () => {
    const task = baseTask({
      assignees: [
        { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
      ],
    });
    const updated = reassignTask(task, "Bob", "2026-03-01");
    expect(updated.assignees).toHaveLength(2);
    expect(updated.assignees[0].to).toBe("2026-03-01");
    expect(updated.assignees[1].name).toBe("Bob");
    expect(updated.assignees[1].from).toBe("2026-03-01");
    expect(updated.assignees[1].to).toBeNull();
  });

  it("returns same task if reassigning to the same person", () => {
    const task = baseTask({
      assignees: [
        { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
      ],
    });
    const updated = reassignTask(task, "Alice");
    expect(updated.assignees).toHaveLength(1);
  });

  it("handles empty name as Unassigned", () => {
    const task = baseTask({
      assignees: [
        { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
      ],
    });
    const updated = reassignTask(task, "", "2026-03-01");
    expect(updated.assignees[1].name).toBe("Unassigned");
  });
});

describe("reassignAccountable", () => {
  it("adds a new entry when reassigning accountable", () => {
    const task = baseTask({
      accountable: [{ name: "Carol", from: "2026-01-01", to: null }],
    });
    const updated = reassignAccountable(task, "Dave", "2026-03-01");
    expect(updated.accountable).toHaveLength(2);
    expect(updated.accountable[1].name).toBe("Dave");
  });

  it("returns same task if reassigning to the same person", () => {
    const task = baseTask({
      accountable: [{ name: "Carol", from: "2026-01-01", to: null }],
    });
    const updated = reassignAccountable(task, "Carol");
    expect(updated.accountable).toHaveLength(1);
  });
});
