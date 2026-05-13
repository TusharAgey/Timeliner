import {
  addWeeks,
  addMonths,
  addDays,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  parse,
  isValid,
  set,
  getDay,
} from "date-fns";
import type { Task } from "../models/types";
import { iso, nextDays } from "./date";
import { uid } from "./utils";
import { makeAccountableHistory, makeAssigneeHistory } from "./assignees";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type DayName = (typeof DAY_NAMES)[number];

const NEXT_DAY_FN: Record<DayName, (date: Date) => Date> = {
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
};

/**
 * Parse a relative date expression like "in 3 days", "in 2 weeks", "in 1 month"
 */
const parseRelativeDate = (token: string): string | null => {
  const match = token.match(
    /^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/i,
  );
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const base = new Date();
  if (unit.startsWith("day")) return iso(addDays(base, amount));
  if (unit.startsWith("week")) return iso(addWeeks(base, amount));
  if (unit.startsWith("month")) return iso(addMonths(base, amount));
  return null;
};

/**
 * Parse "this Friday", "this week", "this month", "next month", "next Tuesday", etc.
 * Also handles bare day names like "monday", "friday" (next occurrence).
 */
const parseThisNextDay = (token: string): string | null => {
  const lower = token.toLowerCase().trim();

  // "this week" → next Monday (start of next week)
  if (lower === "this week") return iso(nextMonday(new Date()));
  // "next week" → next Monday
  if (lower === "next week") return iso(nextMonday(new Date()));
  // "this month" → first of next month
  if (lower === "this month")
    return iso(addMonths(set(new Date(), { date: 1 }), 1));
  // "next month" → first of month after next
  if (lower === "next month")
    return iso(addMonths(set(new Date(), { date: 1 }), 2));
  // "next year" → this month next year
  if (lower === "next year")
    return iso(addMonths(set(new Date(), { date: 1 }), 12));
  // "end of week" / "eow" → next Friday
  if (lower === "end of week" || lower === "eow")
    return iso(nextFriday(new Date()));
  // "end of month" / "eom" → last day of current month
  if (lower === "end of month" || lower === "eom") {
    const lastDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    );
    return iso(lastDay);
  }

  // "this Monday", "this Tuesday", etc. → next occurrence of that day
  const thisMatch = lower.match(
    /^this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (thisMatch) {
    const dayName = thisMatch[1] as DayName;
    const today = new Date();
    const todayDay = getDay(today); // 0=Sunday
    const targetDay = DAY_NAMES.indexOf(dayName);
    if (targetDay === todayDay) return iso(today);
    return iso(NEXT_DAY_FN[dayName](today));
  }

  // "next Monday", "next Tuesday", etc.
  const nextMatch = lower.match(
    /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (nextMatch) {
    return iso(NEXT_DAY_FN[nextMatch[1] as DayName](new Date()));
  }

  // Bare day name: "monday", "friday", etc. → next occurrence
  const bareDayMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (bareDayMatch) {
    const dayName = bareDayMatch[1] as DayName;
    const today = new Date();
    const todayDay = getDay(today);
    const targetDay = DAY_NAMES.indexOf(dayName);
    if (targetDay === todayDay) return iso(today);
    return iso(NEXT_DAY_FN[dayName](today));
  }

  return null;
};

const parseDateToken = (token: string): string | null => {
  const normalized = token.trim().toLowerCase();

  // Basic keywords
  if (normalized === "today") return iso(new Date());
  if (normalized === "tomorrow") return nextDays(1);

  // Relative dates: "in 3 days", "in 2 weeks"
  const relative = parseRelativeDate(token);
  if (relative) return relative;

  // "this X", "next X" patterns (also handles bare day names)
  const thisNext = parseThisNextDay(token);
  if (thisNext) return thisNext;

  // Parse explicit dates: "Mar 5", "Mar 5 2026"
  const parsed = parse(token, "MMM d", new Date());
  if (isValid(parsed)) {
    // If the parsed date is in the past, assume next year
    const withThisYear = set(parsed, { year: new Date().getFullYear() });
    if (withThisYear < new Date()) {
      return iso(set(parsed, { year: new Date().getFullYear() + 1 }));
    }
    return iso(withThisYear);
  }
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

// Build a regex that matches any known date token (for extraction and cleaning)
const buildDateTokenPattern = (): string => {
  const keywords = [
    "today",
    "tomorrow",
    "this week",
    "this month",
    "next month",
    "next year",
    "end of week",
    "end of month",
    "eow",
    "eom",
    // "this Monday" through "this Sunday"
    ...DAY_NAMES.map((d) => `this ${d}`),
    // "next Monday" through "next Sunday"
    ...DAY_NAMES.map((d) => `next ${d}`),
    // bare day names
    ...DAY_NAMES,
    // "next week" is already covered by "next monday" pattern, but keep explicit
    "next week",
    "next monday",
  ];
  // Also match "in X days/weeks/months"
  const relative = "in \\d+ (?:day|days|week|weeks|month|months)";
  // Match "MMM d" or "MMM d yyyy" dates
  const explicitDate = "[A-Z][a-z]{2} \\d{1,2}(?: \\d{4})?";
  // Combine all: first the multi-word keywords (longest first), then single words, then patterns
  const sorted = [...keywords].sort(
    (a, b) => b.split(/\s+/).length - a.split(/\s+/).length,
  );
  const escaped = sorted.map((k) => k.replace(/\s+/g, "\\s+"));
  return `(?:${escaped.join("|")}|${relative}|${explicitDate})`;
};

const DATE_TOKEN_PATTERN = buildDateTokenPattern();

// Build a pattern for date tokens that can follow "due", "by", "starting", "from", "on"
const buildDueDatePattern = (): string => {
  const dayNames = DAY_NAMES.join("|");
  return `(?:${dayNames}|today|tomorrow|this week|this month|next month|next year|end of week|end of month|eow|eom|next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday|this monday|this tuesday|this wednesday|this thursday|this friday|this saturday|this sunday|next week|in \\d+ (?:day|days|week|weeks|month|months)|[A-Z][a-z]{2} \\d{1,2}(?: \\d{4})?)`;
};

const DUE_DATE_PATTERN = buildDueDatePattern();

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

  // --- Extract Jira ticket reference (e.g., PROJ-123) ---
  const jiraMatch = trimmed.match(/\b([A-Z]{2,}-\d+)\b/);

  // --- Extract assignee: "for Name", "@Name", or "by Name" ---
  const assigneeMatch = trimmed.match(
    /(?:for\s+|@|by\s+)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
  );

  // --- Extract date range: "today to tomorrow", "Mar 5 - Mar 10", etc. ---
  const rangeMatch = trimmed.match(
    new RegExp(
      `(${DATE_TOKEN_PATTERN})\\s+(?:to|-|through)\\s+(${DATE_TOKEN_PATTERN})`,
      "i",
    ),
  );

  // --- Extract "due by <date>" or "by <date>" or "due <date>" ---
  const dueMatch = trimmed.match(
    new RegExp(`(?:due\\s+by|due\\s+|by\\s+)(${DUE_DATE_PATTERN})`, "i"),
  );

  // --- Extract "starting <date>" or "from <date>" for start date ---
  const startMatch = trimmed.match(
    new RegExp(`(?:starting\\s+|from\\s+|on\\s+)(${DUE_DATE_PATTERN})`, "i"),
  );

  // --- Extract single date (fallback) ---
  const singleDateMatch = trimmed.match(new RegExp(DATE_TOKEN_PATTERN, "i"));
  const singleDate = singleDateMatch?.[0];

  // --- Extract priority: "p1", "p2", "high", "critical", "asap", etc. ---
  const priorityMatch = trimmed.match(
    /\b(p[1234]|critical|high|medium|low|asap)\b/i,
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
    asap: "Critical",
  };
  const priority = priorityMatch
    ? (priorityMap[priorityMatch[1].toLowerCase()] ?? "Medium")
    : "Medium";

  // --- Extract labels: #label1 #label2 ---
  const labelMatches = trimmed.match(/#(\w+)/g);
  const labels = labelMatches ? labelMatches.map((l) => l.slice(1)) : [];

  // --- Extract blocked reason: "blocked by X" or "blocked: X" ---
  // Use a greedy capture up to end of string or sentence-ending punctuation
  // Note: "blocked:" has no space before the colon, so use \s* before :
  const blockedMatch = trimmed.match(/blocked\s*(?:by|:)\s+(.+?)(?:\.|$)/i);

  // --- Extract deliverable: "deliverable: X" ---
  const deliverableMatch = trimmed.match(/deliverable[:\s]+(.+?)(?:\.|$)/i);

  // --- Extract description: "description: X" or "note: X" ---
  const descriptionMatch = trimmed.match(
    /(?:description|note)[:\s]+(.+?)(?:\.|$)/i,
  );

  // --- Determine dates ---
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (rangeMatch) {
    // Explicit range: "X to Y"
    startDate = parseDateToken(rangeMatch[1]);
    endDate = parseDateToken(rangeMatch[2]);
  } else if (dueMatch) {
    // "due by Friday" or "due Friday" → set end date only
    endDate = parseDateToken(dueMatch[1]);
    // If there's also a start date like "starting Monday", use it
    if (startMatch) {
      startDate = parseDateToken(startMatch[1]);
    }
  } else if (startMatch) {
    // "starting Monday" or "on Monday" → set start date
    startDate = parseDateToken(startMatch[1]);
  } else if (singleDate) {
    // Single date reference → set both start and end to that date (range of 1 day)
    startDate = parseDateToken(singleDate);
    endDate = startDate;
  }

  // --- Clean title by removing parsed tokens ---
  let cleanedTitle = trimmed;

  // Remove "add " or "create " prefix
  cleanedTitle = cleanedTitle.replace(/^(?:add\s+|create\s+)?/i, "");

  // Remove assignee tokens: "for Name", "@Name", "by Name"
  cleanedTitle = cleanedTitle.replace(
    /(?:for\s+|@|by\s+)[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g,
    "",
  );

  // Remove Jira references
  cleanedTitle = cleanedTitle.replace(/jira\s+[A-Z]{2,}-\d+/i, "");
  cleanedTitle = cleanedTitle.replace(/\b[A-Z]{2,}-\d+\b/g, "");

  // Remove date ranges: "X to Y", "X - Y", "X through Y"
  cleanedTitle = cleanedTitle.replace(
    new RegExp(
      `(${DATE_TOKEN_PATTERN})\\s+(?:to|-|through)\\s+(${DATE_TOKEN_PATTERN})`,
      "gi",
    ),
    "",
  );

  // Remove "due by X", "due X", "by X", "starting X", "from X", "on X"
  cleanedTitle = cleanedTitle.replace(
    new RegExp(
      `(?:due\\s+by|due\\s+|by\\s+|starting\\s+|from\\s+|on\\s+)(${DUE_DATE_PATTERN})`,
      "gi",
    ),
    "",
  );

  // Remove standalone date tokens
  cleanedTitle = cleanedTitle.replace(new RegExp(DATE_TOKEN_PATTERN, "gi"), "");

  // Remove priority tokens
  cleanedTitle = cleanedTitle.replace(
    /\b(p[1234]|critical|high|medium|low|asap)\b/gi,
    "",
  );

  // Remove labels
  cleanedTitle = cleanedTitle.replace(/#\w+/g, "");

  // Remove "blocked by X", "blocked: X", "deliverable: X", "description: X", "note: X"
  cleanedTitle = cleanedTitle.replace(/blocked\s*(?:by|:)\s+.+?(?:\.|$)/gi, "");
  cleanedTitle = cleanedTitle.replace(/deliverable[:\s]+.+?(?:\.|$)/gi, "");
  cleanedTitle = cleanedTitle.replace(
    /(?:description|note)[:\s]+.+?(?:\.|$)/gi,
    "",
  );

  // Remove orphaned "due" that may remain after partial cleaning (e.g., "due by friday" → "due" remains)
  cleanedTitle = cleanedTitle.replace(/\bdue\b/gi, "");

  // Collapse whitespace
  cleanedTitle = cleanedTitle.replace(/\s+/g, " ").trim();

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
    deliverable: deliverableMatch?.[1]?.trim() ?? "",
    blockedReason: blockedMatch?.[1]?.trim() ?? "",
    dependencies: [],
    description: descriptionMatch?.[1]?.trim() ?? "",
    confidence:
      startDate || endDate
        ? "high"
        : jiraMatch || assigneeMatch
          ? "medium"
          : "low",
  };
};
