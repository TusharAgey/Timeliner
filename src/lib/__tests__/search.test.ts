import { describe, it, expect } from "vitest";
import { matchesProjectSearch } from "../search";
import type { Project } from "../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  description: "A test project",
  milestones: [],
  tasks: [
    {
      id: "task-1",
      title: "Design login page",
      description: "",
      assignees: [
        { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
      ],
      accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
      jiraLink: "https://jira.local/browse/PROJ-123",
      deliverable: "Login page wireframes",
      startDate: "2026-05-01",
      endDate: "2026-05-15",
      expectedStartDate: "2026-05-01",
      expectedEndDate: "2026-05-15",
      progressPercent: 50,
      priority: "High",
      labels: ["frontend", "auth"],
      blockedReason: "",
      milestoneId: "",
      dependencies: [],
      crossProjectDependencies: [],
      status: "On Track",
      activityLog: [],
      isTemplate: false,
    },
    {
      id: "task-2",
      title: "Setup CI/CD pipeline",
      description: "",
      assignees: [
        { name: "Bob", role: "responsible", from: "2026-01-01", to: null },
      ],
      accountable: [{ name: "Carol", from: "2026-01-01", to: null }],
      jiraLink: "",
      deliverable: "",
      startDate: "2026-05-10",
      endDate: "2026-05-20",
      expectedStartDate: "2026-05-10",
      expectedEndDate: "2026-05-20",
      progressPercent: 0,
      priority: "Medium",
      labels: ["devops"],
      blockedReason: "",
      milestoneId: "",
      dependencies: [],
      crossProjectDependencies: [],
      status: "Not Started",
      activityLog: [],
      isTemplate: false,
    },
  ],
  ...overrides,
});

describe("matchesProjectSearch", () => {
  it("returns the project unchanged for empty query", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "");
    expect(result.tasks).toHaveLength(2);
  });

  it("filters tasks by title", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "login");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-1");
  });

  it("filters tasks by assignee name", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "Alice");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-1");
  });

  it("filters tasks by label", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "devops");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-2");
  });

  it("filters tasks by Jira link", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "PROJ-123");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-1");
  });

  it("filters tasks by computed status", () => {
    const project = makeProject();
    // Make task-1 blocked so its computed status is "At Risk"
    project.tasks[0].blockedReason = "Waiting on design review";
    // task-2 has 0% progress with dates May 10-20, so computeTaskStatus returns "Delayed"
    const result = matchesProjectSearch(project, "At Risk");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-1");
  });

  it("filters tasks by deliverable", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "wireframes");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-1");
  });

  it("returns no tasks when nothing matches", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "nonexistent");
    expect(result.tasks).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "LOGIN");
    expect(result.tasks).toHaveLength(1);
  });

  it("matches partial words", () => {
    const project = makeProject();
    const result = matchesProjectSearch(project, "pipe");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe("task-2");
  });
});
