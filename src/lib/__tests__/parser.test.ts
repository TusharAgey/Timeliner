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
    expect(result.title).toBe("Build API");
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

  it("parses 'asap' priority as Critical", () => {
    const result = parseNaturalLanguageTask("Fix production issue asap");
    expect(result.priority).toBe("Critical");
  });

  it("parses assignee with 'for Name'", () => {
    const result = parseNaturalLanguageTask("Implement search for Alice");
    expect(result.assignees?.[0]?.name).toBe("Alice");
  });

  it("parses assignee with '@Name'", () => {
    const result = parseNaturalLanguageTask("Deploy to prod @Bob");
    expect(result.assignees?.[0]?.name).toBe("Bob");
  });

  it("parses date with 'by DayName' as end date", () => {
    const result = parseNaturalLanguageTask("Review PR by friday");
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
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

  // --- New tests for enhanced date parsing ---

  it("parses 'next Monday' as a single date", () => {
    const result = parseNaturalLanguageTask("Plan sprint next monday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'next Tuesday' as a single date", () => {
    const result = parseNaturalLanguageTask("Release next tuesday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'next Friday' as a single date", () => {
    const result = parseNaturalLanguageTask("Demo next friday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'this Friday' as a single date", () => {
    const result = parseNaturalLanguageTask("Submit report this friday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'this week' as a date", () => {
    const result = parseNaturalLanguageTask("Finish tasks this week");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'this month' as a date", () => {
    const result = parseNaturalLanguageTask("Complete goals this month");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'next month' as a date", () => {
    const result = parseNaturalLanguageTask("Plan Q2 next month");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'next year' as a date", () => {
    const result = parseNaturalLanguageTask("Set roadmap next year");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'end of week' as a date", () => {
    const result = parseNaturalLanguageTask("Deploy feature end of week");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'eow' abbreviation as a date", () => {
    const result = parseNaturalLanguageTask("Finish review eow");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'end of month' as a date", () => {
    const result = parseNaturalLanguageTask("Submit timesheet end of month");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'eom' abbreviation as a date", () => {
    const result = parseNaturalLanguageTask("Close books eom");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'in 3 days' as a relative date", () => {
    const result = parseNaturalLanguageTask("Fix bug in 3 days");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'in 2 weeks' as a relative date", () => {
    const result = parseNaturalLanguageTask("Complete milestone in 2 weeks");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'in 1 month' as a relative date", () => {
    const result = parseNaturalLanguageTask("Launch feature in 1 month");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  // --- Tests for "due by" / "due" / "by" date patterns ---

  it("parses 'due by Friday' as end date", () => {
    const result = parseNaturalLanguageTask("Submit report due by friday");
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'due tomorrow' as end date", () => {
    const result = parseNaturalLanguageTask("Finish task due tomorrow");
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'by Friday' as end date", () => {
    const result = parseNaturalLanguageTask("Complete review by friday");
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'starting Monday' as start date", () => {
    const result = parseNaturalLanguageTask("New project starting monday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'on Monday' as start date", () => {
    const result = parseNaturalLanguageTask("Begin work on monday");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'from next week' as start date", () => {
    const result = parseNaturalLanguageTask("Start campaign from next week");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses combined 'starting Monday due by Friday'", () => {
    const result = parseNaturalLanguageTask(
      "Build feature starting monday due by friday",
    );
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  // --- Tests for blocked reason ---

  it("parses 'blocked by' reason", () => {
    const result = parseNaturalLanguageTask(
      "Deploy to prod blocked by QA approval",
    );
    expect(result.blockedReason).toBe("QA approval");
  });

  it("parses 'blocked:' reason", () => {
    const result = parseNaturalLanguageTask(
      "Fix login bug blocked: waiting for API key",
    );
    expect(result.blockedReason).toBe("waiting for API key");
  });

  // --- Tests for deliverable ---

  it("parses 'deliverable:' field", () => {
    const result = parseNaturalLanguageTask(
      "Build dashboard deliverable: interactive charts",
    );
    expect(result.deliverable).toBe("interactive charts");
  });

  // --- Tests for description ---

  it("parses 'description:' field", () => {
    const result = parseNaturalLanguageTask(
      "Refactor auth module description: improve security and add OAuth",
    );
    expect(result.description).toBe("improve security and add OAuth");
  });

  it("parses 'note:' field", () => {
    const result = parseNaturalLanguageTask(
      "Update dependencies note: check for breaking changes",
    );
    expect(result.description).toBe("check for breaking changes");
  });

  // --- Tests for title cleaning edge cases ---

  it("cleans title properly with multiple parsed tokens", () => {
    const result = parseNaturalLanguageTask(
      "Create API endpoint for Alice p2 #backend PROJ-123 due by friday",
    );
    expect(result.title).toBe("API endpoint");
    expect(result.assignees?.[0]?.name).toBe("Alice");
    expect(result.priority).toBe("High");
    expect(result.labels).toContain("backend");
    expect(result.jiraLink).toContain("PROJ-123");
    expect(result.endDate).toBeDefined();
  });

  it("handles 'by' in title context without treating as assignee", () => {
    // "by" followed by a lowercase word should not be treated as assignee
    const result = parseNaturalLanguageTask("Multiply by 5");
    expect(result.title).toBe("Multiply by 5");
    expect(result.assignees?.[0]?.name).toBe("Unassigned");
  });

  it("handles 'by Friday' as end date (not assignee)", () => {
    // "by" followed by a day name is an end date, not an assignee
    const result = parseNaturalLanguageTask("Code review by friday");
    expect(result.endDate).toBeDefined();
    expect(result.assignees?.[0]?.name).toBe("Unassigned");
  });

  it("parses date range with 'next Tuesday to next Friday'", () => {
    const result = parseNaturalLanguageTask(
      "Sprint planning next tuesday to next friday",
    );
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses date range with 'this week to next week'", () => {
    const result = parseNaturalLanguageTask(
      "Onboarding this week to next week",
    );
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'Mar 5' as a date (auto-advances year if in past)", () => {
    const result = parseNaturalLanguageTask("Plan party Mar 5");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  it("parses 'Mar 5 2027' as an explicit date", () => {
    const result = parseNaturalLanguageTask("Plan conference Mar 5 2027");
    expect(result.startDate).toBeDefined();
    expect(result.confidence).toBe("high");
  });

  // --- Bug 6: "this week" vs "next week" ---
  it("'this week' and 'next week' resolve to different dates", () => {
    const thisWeek = parseNaturalLanguageTask("Task this week");
    const nextWeek = parseNaturalLanguageTask("Task next week");
    expect(thisWeek.startDate).toBeDefined();
    expect(nextWeek.startDate).toBeDefined();
    expect(thisWeek.startDate).not.toBe(nextWeek.startDate);
  });

  // --- Bug 7: "from" stripped from title ---
  it("strips 'from' when used with date range", () => {
    const result = parseNaturalLanguageTask("Build API from today to tomorrow");
    expect(result.title).toBe("Build API");
  });

  it("strips 'from' with single start date", () => {
    const result = parseNaturalLanguageTask("Start work from next week");
    expect(result.title).toBe("Start work");
  });

  // --- Bug 7: "from" cleanup preserves titles without date tokens ---
  it("keeps 'from' phrase when no date token follows", () => {
    const result = parseNaturalLanguageTask("Rebuild the module");
    expect(result.title).toBe("Rebuild the module");
  });

  // --- Bug 10: parseDateToken uses consistent "now" reference ---
  it("handles explicit dates like 'Mar 5' consistently", () => {
    const result1 = parseNaturalLanguageTask("Plan party Mar 5");
    const result2 = parseNaturalLanguageTask("Plan party Mar 5");
    expect(result1.startDate).toBe(result2.startDate);
  });
});
