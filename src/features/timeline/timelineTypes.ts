import type { Project, Task } from "../../models/types";

export type TimelineZoom = "week" | "month" | "quarter";
export type TimelineFilter = "all" | "overdue" | "atRisk" | "startsToday";
export type PriorityFilter = "all" | "Low" | "Medium" | "High" | "Critical";

export type TimelineLane = {
  side: "left" | "right";
  project: Project;
};

export type TimelineTaskItem = {
  lane: TimelineLane;
  task: Task;
};
