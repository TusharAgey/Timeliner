import { describe, it, expect } from "vitest";
import {
  projectSummary,
  aggregateVisibleSummary,
  computeProjectHealth,
  computeProjectIntelligenceSummary,
} from "../summary";
import type { Project } from "../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  description: "",
  milestones: [],
  tasks: [],
  ...overrides,
});

const makeTask = (overrides: Record<string, unknown> = {}) => ({
  id: "task-1",
  title: "Test task",
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
  progressPercent: 0,
  priority: "Medium" as const,
  labels: [],
  blockedReason: "",
  milestoneId: "",
  dependencies: [],
  crossProjectDependencies: [],
  status: "Not Started" as const,
  activityLog: [],
  isTemplate: false,
  ...overrides,
});

describe("projectSummary", () => {
  it("returns zeros for empty project", () => {
    const project = makeProject();
    const summary = projectSummary(project);
    expect(summary.totalTasks).toBe(0);
    expect(summary.done).toBe(0);
    expect(summary.overdue).toBe(0);
    expect(summary.atRisk).toBe(0);
    expect(summary.startingThisWeek).toBe(0);
    expect(summary.milestoneCount).toBe(0);
  });

  it("counts done tasks", () => {
    const project = makeProject({
      tasks: [makeTask({ progressPercent: 100 })],
    });
    expect(projectSummary(project).done).toBe(1);
  });

  it("counts overdue tasks", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const project = makeProject({
      tasks: [
        makeTask({
          endDate: pastDate.toISOString().slice(0, 10),
          progressPercent: 50,
        }),
      ],
    });
    expect(projectSummary(project).overdue).toBe(1);
  });

  it("counts at-risk and delayed as atRisk", () => {
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 20);
    const futureEndStr = futureEnd.toISOString().slice(0, 10);
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() - 10);
    const futureStartStr = futureStart.toISOString().slice(0, 10);
    const project = makeProject({
      tasks: [
        makeTask({ blockedReason: "Blocked" }),
        // Task with dates that make it "Delayed" (not past end date, but behind)
        makeTask({
          startDate: futureStartStr,
          endDate: futureEndStr,
          expectedStartDate: futureStartStr,
          expectedEndDate: futureEndStr,
          progressPercent: 10,
        }),
      ],
    });
    expect(projectSummary(project).atRisk).toBe(2);
  });

  it("counts milestones", () => {
    const project = makeProject({
      milestones: [
        {
          id: "m1",
          title: "M1",
          date: "2026-06-01",
          description: "",
          color: "",
        },
      ],
    });
    expect(projectSummary(project).milestoneCount).toBe(1);
  });
});

describe("aggregateVisibleSummary", () => {
  it("returns dash for no milestones", () => {
    const result = aggregateVisibleSummary([makeProject()]);
    expect(result.nextMilestoneLabel).toBe("—");
    expect(result.overdue).toBe(0);
    expect(result.atRisk).toBe(0);
    expect(result.startsToday).toBe(0);
  });
});

describe("computeProjectHealth", () => {
  it("returns healthy for empty project", () => {
    const health = computeProjectHealth(makeProject());
    expect(health.score).toBe(100);
    expect(health.tone).toBe("green");
    expect(health.label).toBe("Healthy");
  });

  it("deducts points for overdue tasks", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const project = makeProject({
      tasks: [
        makeTask({
          endDate: pastDate.toISOString().slice(0, 10),
          progressPercent: 50,
        }),
      ],
    });
    const health = computeProjectHealth(project);
    // Score starts at 100, -10 for overdue, -5 for behind progress
    expect(health.score).toBe(85);
    expect(health.reasons.length).toBeGreaterThan(0);
  });

  it("returns critical for very low scores", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const project = makeProject({
      tasks: Array.from({ length: 10 }, (_, i) =>
        makeTask({
          id: `task-${i}`,
          endDate: pastDate.toISOString().slice(0, 10),
          progressPercent: 10,
        }),
      ),
    });
    const health = computeProjectHealth(project);
    expect(health.tone).toBe("red");
    expect(health.label).toBe("Critical");
  });
});

describe("computeProjectIntelligenceSummary", () => {
  it("returns fallback messages for empty projects", () => {
    const summary = computeProjectIntelligenceSummary([makeProject()]);
    expect(summary.highlights.length).toBeGreaterThan(0);
    expect(summary.lowlights.length).toBeGreaterThan(0);
    expect(summary.risks.length).toBeGreaterThan(0);
    expect(summary.milestones).toHaveLength(0);
    expect(summary.health).toHaveLength(1);
  });

  it("includes completed tasks in highlights", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);
    const project = makeProject({
      tasks: [
        makeTask({
          progressPercent: 100,
          endDate: recentDate.toISOString().slice(0, 10),
        }),
      ],
    });
    const summary = computeProjectIntelligenceSummary([project]);
    const hasCompletionHighlight = summary.highlights.some((h) =>
      h.includes("completed"),
    );
    expect(hasCompletionHighlight).toBe(true);
  });
});
