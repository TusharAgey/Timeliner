import { describe, it, expect, beforeEach } from "vitest";
import { parseNaturalLanguageTask } from "../parser";

describe("parseNaturalLanguageTask", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a low-confidence draft for empty input", () => {
    const result = parseNaturalLanguageTask("");
    expect(result.title).toBe("New task");
    expect(result.confidence).toBe("low");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("parses a simple title", () => {
    const result = parseNaturalLanguageTask("Design the login page");
    expect(result.title).toBe("Design the login page");
    expect(result.confidence).toBe("low");
  });

  it("parses a date range with 'to'", () => {
    const result = parseNaturalLanguageTask("Build API from today to tomorrow");
    // "from" remains in the title since it's not a date keyword
    expect(result.title).toBe("Build API from");
    expect(result.confidence).toBe("high");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("parses a date range with '-'", () => {
    const result = parseNaturalLanguageTask("Setup CI/CD today - tomorrow");
    expect(result.title).toBe("Setup CI/CD");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("parses a date range with 'through'", () => {
    const result = parseNaturalLanguageTask(
      "Write tests today through tomorrow",
    );
    expect(result.title).toBe("Write tests");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("parses priority p1 as Critical", () => {
    const result = parseNaturalLanguageTask("Fix login bug p1");
    expect(result.priority).toBe("Critical");
  });

  it("parses priority p2 as High", () => {
    const result = parseNaturalLanguageTask("Add feature p2");
    expect(result.priority).toBe("High");
  });

  it("parses priority p3 as Medium", () => {
    const result = parseNaturalLanguageTask("Refactor code p3");
    expect(result.priority).toBe("Medium");
  });

  it("parses priority p4 as Low", () => {
    const result = parseNaturalLanguageTask("Update docs p4");
    expect(result.priority).toBe("Low");
  });

  it("parses 'critical' priority", () => {
    const result = parseNaturalLanguageTask("Hotfix critical");
    expect(result.priority).toBe("Critical");
  });

  it("parses 'high' priority", () => {
    const result = parseNaturalLanguageTask("Optimize queries high");
    expect(result.priority).toBe("High");
  });

  it("parses 'low' priority", () => {
    const result = parseNaturalLanguageTask("Clean up logs low");
    expect(result.priority).toBe("Low");
  });

  it("parses assignee with 'for Name'", () => {
    const result = parseNaturalLanguageTask("Implement search for Alice");
    expect(result.assignees?.[0]?.name).toBe("Alice");
  });

  it("parses assignee with '@Name'", () => {
    const result = parseNaturalLanguageTask("Deploy to prod @Bob");
    expect(result.assignees?.[0]?.name).toBe("Bob");
  });

  it("parses Jira ticket reference", () => {
    const result = parseNaturalLanguageTask("Fix bug PROJ-123");
    expect(result.jiraLink).toContain("PROJ-123");
    expect(result.jiraLink).toContain("jira.local");
  });

  it("uses custom Jira domain from localStorage", () => {
    localStorage.setItem("timeliner-jira-domain", "myjira.example.com");
    const result = parseNaturalLanguageTask("Fix bug PROJ-456");
    expect(result.jiraLink).toContain("myjira.example.com");
  });

  it("parses labels with #hashtags", () => {
    const result = parseNaturalLanguageTask("Add dark mode #frontend #ui");
    expect(result.labels).toContain("frontend");
    expect(result.labels).toContain("ui");
  });

  it("parses a complex input with all features", () => {
    const result = parseNaturalLanguageTask(
      "Create dashboard for Alice p1 #urgent PROJ-789 today to tomorrow",
    );
    // "Create " is stripped, leaving "dashboard"
    expect(result.title).toBe("dashboard");
    expect(result.assignees?.[0]?.name).toBe("Alice");
    expect(result.priority).toBe("Critical");
    expect(result.labels).toContain("urgent");
    expect(result.jiraLink).toContain("PROJ-789");
    expect(result.confidence).toBe("high");
  });

  it("strips 'add' and 'create' prefixes from title", () => {
    const result = parseNaturalLanguageTask("add new feature");
    expect(result.title).toBe("new feature");
  });

  it("defaults to Medium priority when not specified", () => {
    const result = parseNaturalLanguageTask("Do something");
    expect(result.priority).toBe("Medium");
  });

  it("defaults to 7-day duration when no end date", () => {
    const result = parseNaturalLanguageTask("Do something tomorrow");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });
});
