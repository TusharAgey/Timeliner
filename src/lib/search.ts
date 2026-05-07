import type { Project } from "../models/types";
import { getAccountableHistory, getAssigneeHistory } from "./assignees";
import { computeTaskStatus } from "./status";

export const matchesProjectSearch = (project: Project, query: string) => {
  const term = query.trim().toLowerCase();
  if (!term) return project;

  return {
    ...project,
    tasks: project.tasks.filter((task) => {
      const haystack = [
        task.title,
        getAssigneeHistory(task)
          .map((entry) => entry.name)
          .join(" "),
        getAccountableHistory(task)
          .map((entry) => entry.name)
          .join(" "),
        task.jiraLink,
        task.labels.join(" "),
        computeTaskStatus(task),
        task.deliverable,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    }),
  };
};
