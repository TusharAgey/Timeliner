import type { z } from "zod";
import type {
  taskPrioritySchema,
  taskStatusSchema,
  milestoneSchema,
  taskAssigneeSchema,
  taskAccountableSchema,
  crossProjectDependencySchema,
  activityLogEntrySchema,
  taskTemplateSchema,
  taskSchema,
  projectSchema,
  tabSchema,
  personSchema,
  labelSchema,
  workspaceSchema,
} from "./schemas";

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;
export type TaskAccountable = z.infer<typeof taskAccountableSchema>;
export type CrossProjectDependency = z.infer<
  typeof crossProjectDependencySchema
>;
export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectSchema>;
export type WorkspaceTab = z.infer<typeof tabSchema>;
export type Person = z.infer<typeof personSchema>;
export type Label = z.infer<typeof labelSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;

export type WorkspaceData = {
  workspace: Workspace;
  projects: Project[];
  people: Person[];
  labels: Label[];
};
