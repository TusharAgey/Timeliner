import { addWeeks, nextMonday, parse, isValid } from "date-fns";
import type { Task } from "../models/types";
import { iso, nextDays } from "./date";
import { uid } from "./utils";
import { makeAccountableHistory, makeAssigneeHistory } from "./assignees";

const parseDateToken = (token: string): string | null => {
  const normalized = token.trim().toLowerCase();
  if (normalized === "today") return iso(new Date());
  if (normalized === "tomorrow") return nextDays(1);
  if (normalized === "next monday") return iso(nextMonday(new Date()));
  if (normalized === "next week") return iso(addWeeks(new Date(), 1));

  const parsed = parse(token, "MMM d", new Date());
  if (isValid(parsed)) return iso(parsed);
  const parsedFull = parse(token, "MMM d yyyy", new Date());
  if (isValid(parsedFull)) return iso(parsedFull);
  return null;
};

export type ParsedTaskDraft = Partial<Task> & {
  title: string;
  confidence: "high" | "medium" | "low";
};

// Get Jira domain from localStorage or default
const getJiraDomain = (): string => {
  try {
    return localStorage.getItem("timeliner-jira-domain") || "jira.local";
  } catch {
    return "jira.local";
  }
};

export const parseNaturalLanguageTask = (input: string): ParsedTaskDraft => {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      id: uid("task"),
      title: "New task",
      assignees: makeAssigneeHistory("Unassigned", nextDays(1)),
      accountable: makeAccountableHistory("Unassigned", nextDays(1)),
      startDate: nextDays(1),
      endDate: nextDays(7),
      expectedStartDate: nextDays(1),
      expectedEndDate: nextDays(7),
      progressPercent: 0,
      priority: "Medium",
      labels: [],
      deliverable: "",
      blockedReason: "",
      dependencies: [],
      description: "",
      confidence: "low",
    };
  }

  // Extract Jira ticket reference (e.g., PROJ-123)
  const jiraMatch = trimmed.match(/\b([A-Z]{2,}-\d+)\b/);

  // Extract assignee: "for Name" or "@Name"
  const assigneeMatch = trimmed.match(
    /(?:for\s+|@)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
  );

  // Extract date range: "today to tomorrow", "Mar 5 - Mar 10", etc.
  const rangeMatch = trimmed.match(
    /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)\s+(?:to|-|through)\s+(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)/i,
  );

  // Extract single date
  const singleDateMatch = trimmed.match(
    /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)/i,
  );

  // Extract priority: "p1", "p2", "high", "critical", etc.
  const priorityMatch = trimmed.match(
    /\b(p[1234]|critical|high|medium|low)\b/i,
  );
  const priorityMap: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
    p1: "Critical",
    p2: "High",
    p3: "Medium",
    p4: "Low",
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  const priority = priorityMatch
    ? (priorityMap[priorityMatch[1].toLowerCase()] ?? "Medium")
    : "Medium";

  // Extract labels: #label1 #label2
  const labelMatches = trimmed.match(/#(\w+)/g);
  const labels = labelMatches ? labelMatches.map((l) => l.slice(1)) : [];

  const startDate = rangeMatch
    ? parseDateToken(rangeMatch[1])
    : singleDateMatch
      ? parseDateToken(singleDateMatch[1])
      : null;
  const endDate = rangeMatch ? parseDateToken(rangeMatch[2]) : startDate;

  // Clean title by removing parsed tokens
  const cleanedTitle = trimmed
    .replace(/^(?:add\s+|create\s+)?/i, "")
    .replace(/(?:for\s+|@)[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g, "")
    .replace(/jira\s+[A-Z]{2,}-\d+/i, "")
    .replace(/\b[A-Z]{2,}-\d+\b/g, "")
    .replace(
      /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)(\s+(?:to|-|through)\s+(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?))?/gi,
      "",
    )
    .replace(/\b(p[1234]|critical|high|medium|low)\b/gi, "")
    .replace(/#\w+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const jiraDomain = getJiraDomain();

  return {
    id: uid("task"),
    title: cleanedTitle || "New task",
    assignees: makeAssigneeHistory(
      assigneeMatch?.[1] ?? "Unassigned",
      startDate ?? nextDays(1),
    ),
    accountable: makeAccountableHistory(
      assigneeMatch?.[1] ?? "Unassigned",
      startDate ?? nextDays(1),
    ),
    jiraLink: jiraMatch ? `https://${jiraDomain}/browse/${jiraMatch[1]}` : "",
    startDate: startDate ?? nextDays(1),
    endDate: endDate ?? nextDays(7),
    expectedStartDate: startDate ?? nextDays(1),
    expectedEndDate: endDate ?? nextDays(7),
    progressPercent: 0,
    priority,
    labels,
    deliverable: "",
    blockedReason: "",
    dependencies: [],
    description: "",
    confidence: startDate
      ? "high"
      : jiraMatch || assigneeMatch
        ? "medium"
        : "low",
  };
};
