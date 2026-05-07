import type { Task, TaskAccountable, TaskAssignee } from "../models/types";
import { iso } from "./date";

type LegacyTask = Task & { assignee?: string };

export const makeAssigneeHistory = (
  name = "Unassigned",
  from = iso(new Date()),
): TaskAssignee[] => [
  { name: name || "Unassigned", role: "responsible", from, to: null },
];

export const makeAccountableHistory = (
  name = "Unassigned",
  from = iso(new Date()),
): TaskAccountable[] => [{ name: name || "Unassigned", from, to: null }];

export const getAssigneeHistory = (task: Task): TaskAssignee[] => {
  const legacy = task as LegacyTask;
  if (task.assignees.length) {
    return task.assignees.map((entry) => ({
      ...entry,
      role: "responsible" as const,
    }));
  }
  return makeAssigneeHistory(legacy.assignee ?? "Unassigned", task.startDate);
};

export const getAccountableHistory = (task: Task): TaskAccountable[] => {
  if (task.accountable.length) return task.accountable;
  return makeAccountableHistory(getCurrentAssignee(task), task.startDate);
};

export const getCurrentAssignee = (task: Task) =>
  getAssigneeHistory(task).find((entry) => entry.to === null)?.name ??
  getAssigneeHistory(task).at(-1)?.name ??
  "Unassigned";

export const getCurrentAccountable = (task: Task) =>
  getAccountableHistory(task).find((entry) => entry.to === null)?.name ??
  getAccountableHistory(task).at(-1)?.name ??
  "Unassigned";

export const getPreviousAssignees = (task: Task) =>
  getAssigneeHistory(task).filter((entry) => entry.to !== null);

export const getPreviousAccountables = (task: Task) =>
  getAccountableHistory(task).filter((entry) => entry.to !== null);

export const normalizeAssignees = (task: Task): Task => ({
  ...task,
  assignees: getAssigneeHistory(task),
  accountable: getAccountableHistory(task),
});

export const reassignTask = (
  task: Task,
  nextName: string,
  changedAt = iso(new Date()),
): Task => {
  const name = nextName.trim() || "Unassigned";
  const history = getAssigneeHistory(task);
  const current = history.find((entry) => entry.to === null);

  if (current?.name === name) return normalizeAssignees(task);

  return {
    ...normalizeAssignees(task),
    assignees: [
      ...history.map((entry) =>
        entry.to === null ? { ...entry, to: changedAt } : entry,
      ),
      { name, role: "responsible", from: changedAt, to: null },
    ],
  };
};

export const reassignAccountable = (
  task: Task,
  nextName: string,
  changedAt = iso(new Date()),
): Task => {
  const name = nextName.trim() || "Unassigned";
  const history = getAccountableHistory(task);
  const current = history.find((entry) => entry.to === null);

  if (current?.name === name) return normalizeAssignees(task);

  return {
    ...normalizeAssignees(task),
    accountable: [
      ...history.map((entry) =>
        entry.to === null ? { ...entry, to: changedAt } : entry,
      ),
      { name, from: changedAt, to: null },
    ],
  };
};
