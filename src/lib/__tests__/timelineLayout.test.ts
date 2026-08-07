import { describe, it, expect } from "vitest";
import {
  timeToY,
  getTaskTargetDate,
  resolveCardTop,
  resolveFutureCollisions,
  resolvePastCollisions,
  CARD_HEIGHT,
  CARD_GAP,
  TODAY_GAP,
} from "../../features/timeline/timelineLayout";
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
  milestoneId: "",
  dependencies: [],
  crossProjectDependencies: [],
  status: "Not Started",
  activityLog: [],
  isTemplate: false,
  ...overrides,
});

describe("timeToY", () => {
  const scale = { minOffset: 0, scale: 10, today: new Date(2026, 4, 1) };

  it("returns 0 for the reference date", () => {
    expect(timeToY(new Date(2026, 4, 1), scale)).toBe(0);
  });

  it("scales positive day offsets", () => {
    expect(timeToY(new Date(2026, 4, 3), scale)).toBe(20);
  });

  it("scales negative day offsets", () => {
    expect(timeToY(new Date(2026, 3, 28), scale)).toBe(-30);
  });

  it("accounts for minOffset", () => {
    const withOffset = { ...scale, minOffset: 2 };
    expect(timeToY(new Date(2026, 4, 1), withOffset)).toBe(-20);
  });
});

describe("getTaskTargetDate", () => {
  it("returns the expected end date when present", () => {
    const task = makeTask({ expectedEndDate: "2026-06-10" });
    const result = getTaskTargetDate(task);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(10);
  });

  it("falls back to end date when expected end date is empty", () => {
    const task = makeTask({ expectedEndDate: "", endDate: "2026-07-04" });
    const result = getTaskTargetDate(task);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(4);
  });

  it("returns today when both dates are empty (C3 guard)", () => {
    const task = makeTask({ expectedEndDate: "", endDate: "" });
    const result = getTaskTargetDate(task);
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(now.getDate());
  });

  it("returns today when the date is invalid", () => {
    const task = makeTask({
      expectedEndDate: "not-a-date",
      endDate: "also-bad",
    });
    const result = getTaskTargetDate(task);
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(now.getDate());
  });
});

describe("resolveCardTop", () => {
  const base = {
    baseY: 100,
    todayY: 200,
    targetDate: new Date(2026, 5, 1),
    currentDay: new Date(2026, 5, 1),
  };

  it("places future cards below today with a gap", () => {
    const top = resolveCardTop(base);
    expect(top).toBe(200 + TODAY_GAP);
  });

  it("places past cards above today with a gap", () => {
    const top = resolveCardTop({
      ...base,
      targetDate: new Date(2026, 4, 1), // before currentDay
    });
    expect(top).toBe(
      Math.min(100 - CARD_HEIGHT, 200 - TODAY_GAP - CARD_HEIGHT),
    );
  });

  it("respects a custom height for past cards", () => {
    const top = resolveCardTop({
      ...base,
      targetDate: new Date(2026, 4, 1),
      height: 100,
    });
    expect(top).toBe(Math.min(100 - 100, 200 - TODAY_GAP - 100));
  });
});

describe("resolveFutureCollisions", () => {
  it("sorts items by top and pushes overlapping items down", () => {
    const items = [
      { id: "a", top: 100, height: 50 },
      { id: "b", top: 120, height: 50 },
      { id: "c", top: 90, height: 50 },
    ];
    const resolved = resolveFutureCollisions(items);
    // Sorted by top: c(90), a(100), b(120)
    expect(resolved[0].id).toBe("c");
    expect(resolved[0].top).toBe(90);
    // a must be at least c.top + height + gap
    expect(resolved[1].top).toBe(90 + 50 + CARD_GAP);
    // b must be at least a.top + height + gap
    expect(resolved[2].top).toBe(resolved[1].top + 50 + CARD_GAP);
  });

  it("does not move items that do not overlap", () => {
    const items = [
      { id: "a", top: 100, height: 50 },
      { id: "b", top: 300, height: 50 },
    ];
    const resolved = resolveFutureCollisions(items);
    expect(resolved[0].top).toBe(100);
    expect(resolved[1].top).toBe(300);
  });
});

describe("resolvePastCollisions", () => {
  it("sorts items descending and pushes overlapping items up", () => {
    const items = [
      { id: "a", top: 100, height: 50 },
      { id: "b", top: 120, height: 50 },
      { id: "c", top: 90, height: 50 },
    ];
    const resolved = resolvePastCollisions(items);
    // Final result sorted ascending by top
    expect(resolved.map((r) => r.id)).toEqual(["c", "a", "b"]);
    // b (highest) stays at 120
    expect(resolved[2].top).toBe(120);
    // a must be at most b.top - gap - height
    expect(resolved[1].top).toBe(120 - CARD_GAP - 50);
    // c must be at most a.top - gap - height
    expect(resolved[0].top).toBe(resolved[1].top - CARD_GAP - 50);
  });
});
