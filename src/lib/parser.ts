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

export const parseNaturalLanguageTask = (input: string): ParsedTaskDraft => {
  const jiraMatch = input.match(/\b([A-Z]{2,}-\d+)\b/);
  const assigneeMatch = input.match(/for\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  const rangeMatch = input.match(
    /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)\s+(?:to|-)\s+(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)/i,
  );
  const singleDateMatch = input.match(
    /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)/i,
  );

  const startDate = rangeMatch
    ? parseDateToken(rangeMatch[1])
    : singleDateMatch
      ? parseDateToken(singleDateMatch[1])
      : null;
  const endDate = rangeMatch ? parseDateToken(rangeMatch[2]) : startDate;

  const cleanedTitle = input
    .replace(/add\s+/i, "")
    .replace(/for\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g, "")
    .replace(/jira\s+[A-Z]{2,}-\d+/i, "")
    .replace(
      /(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?)(\s+(to|-)\s+(today|tomorrow|next monday|next week|[A-Z][a-z]{2}\s\d{1,2}(?:\s\d{4})?))?/gi,
      "",
    )
    .trim();

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
    jiraLink: jiraMatch ? `https://jira.local/browse/${jiraMatch[1]}` : "",
    startDate: startDate ?? nextDays(1),
    endDate: endDate ?? nextDays(7),
    expectedStartDate: startDate ?? nextDays(1),
    expectedEndDate: endDate ?? nextDays(7),
    progressPercent: 0,
    priority: "Medium",
    labels: [],
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
