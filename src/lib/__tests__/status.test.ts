import { describe, it, expect } from "vitest";
import { computeTaskStatus, statusTone } from "../status";
import type { Task } from "../../models/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test task",
  description: "",
  assignees: [
    { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
  ],
  accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
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

describe("computeTaskStatus", () => {
  it("returns Done when progress is 100%", () => {
    expect(computeTaskStatus(makeTask({ progressPercent: 100 }))).toBe("Done");
  });

  it("returns Done when progress exceeds 100%", () => {
    expect(computeTaskStatus(makeTask({ progressPercent: 150 }))).toBe("Done");
  });

  it("returns Not Started when before start date and 0% progress", () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 10);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 20);
    expect(
      computeTaskStatus(
        makeTask({
          startDate: futureStart.toISOString().slice(0, 10),
          endDate: futureEnd.toISOString().slice(0, 10),
          progressPercent: 0,
        }),
      ),
    ).toBe("Not Started");
  });

  it("returns Overdue when past end date", () => {
    const pastEnd = new Date();
    pastEnd.setDate(pastEnd.getDate() - 5);
    expect(
      computeTaskStatus(
        makeTask({
          endDate: pastEnd.toISOString().slice(0, 10),
          progressPercent: 50,
        }),
      ),
    ).toBe("Overdue");
  });

  it("returns At Risk when blocked", () => {
    expect(
      computeTaskStatus(makeTask({ blockedReason: "Waiting on vendor" })),
    ).toBe("At Risk");
  });

  it("returns Ahead when progress exceeds expected by >= 15%", () => {
    // Task that started 10 days ago, duration 20 days
    // Expected progress: ~52%, Actual: 70% => delta >= 15% => Ahead
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(
      computeTaskStatus(
        makeTask({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          expectedStartDate: start.toISOString().slice(0, 10),
          expectedEndDate: end.toISOString().slice(0, 10),
          progressPercent: 70,
        }),
      ),
    ).toBe("Ahead");
  });

  it("returns Delayed when progress is <= -30% behind expected", () => {
    // Task that started 10 days ago, duration 20 days
    // Expected progress: 10/20 = 50%
    // Actual: 20% => delta = -30% => Delayed
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(
      computeTaskStatus(
        makeTask({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          expectedStartDate: start.toISOString().slice(0, 10),
          expectedEndDate: end.toISOString().slice(0, 10),
          progressPercent: 20,
        }),
      ),
    ).toBe("Delayed");
  });

  it("returns At Risk when progress is between -12% and -30% behind", () => {
    // Expected: 50%, Actual: 35% => delta = -15% => At Risk
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(
      computeTaskStatus(
        makeTask({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          expectedStartDate: start.toISOString().slice(0, 10),
          expectedEndDate: end.toISOString().slice(0, 10),
          progressPercent: 35,
        }),
      ),
    ).toBe("At Risk");
  });

  it("returns On Track when progress is close to expected", () => {
    // Expected: 50%, Actual: 45% => delta = -5% => On Track
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(
      computeTaskStatus(
        makeTask({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          expectedStartDate: start.toISOString().slice(0, 10),
          expectedEndDate: end.toISOString().slice(0, 10),
          progressPercent: 45,
        }),
      ),
    ).toBe("On Track");
  });

  it("handles 1-day tasks correctly", () => {
    const today = new Date().toISOString().slice(0, 10);
    // 1-day task, today, 0% progress => expected = 100%, delta = -100% => Delayed
    expect(
      computeTaskStatus(
        makeTask({
          startDate: today,
          endDate: today,
          expectedStartDate: today,
          expectedEndDate: today,
          progressPercent: 0,
        }),
      ),
    ).toBe("Delayed");
  });
});

describe("statusTone", () => {
  it("has entries for all statuses", () => {
    const statuses = [
      "Not Started",
      "On Track",
      "Ahead",
      "At Risk",
      "Delayed",
      "Overdue",
      "Done",
    ];
    for (const status of statuses) {
      expect(statusTone[status as keyof typeof statusTone]).toBeDefined();
      expect(typeof statusTone[status as keyof typeof statusTone]).toBe(
        "string",
      );
    }
  });
});
