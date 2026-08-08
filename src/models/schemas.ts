import { z } from "zod";

export const taskPrioritySchema = z.enum(["Low", "Medium", "High", "Critical"]);
export const taskStatusSchema = z.enum([
  "Not Started",
  "On Track",
  "Ahead",
  "At Risk",
  "Delayed",
  "Overdue",
  "Done",
]);

export const milestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  description: z.string().default(""),
  color: z.string().default(""),
});

export const taskAssigneeSchema = z.object({
  name: z.string(),
  role: z.literal("responsible").default("responsible"),
  from: z.string(),
  to: z.string().nullable(),
});

export const taskAccountableSchema = z.object({
  name: z.string(),
  from: z.string(),
  to: z.string().nullable(),
});

export const crossProjectDependencySchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  label: z.string().default(""),
});

export const activityLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.string(),
  field: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  actor: z.string().default("You"),
});

export const taskTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string().default(""),
  assignees: z.array(taskAssigneeSchema).default([]),
  accountable: z.array(taskAccountableSchema).default([]),
  deliverable: z.string().default(""),
  priority: taskPrioritySchema,
  labels: z.array(z.string()).default([]),
  durationDays: z.number().default(7),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  assignees: z.array(taskAssigneeSchema).default([]),
  accountable: z.array(taskAccountableSchema).default([]),
  jiraLink: z.string().default(""),
  deliverable: z.string().default(""),
  startDate: z.string(),
  endDate: z.string(),
  expectedStartDate: z.string(),
  expectedEndDate: z.string(),
  progressPercent: z.number().min(0).max(100),
  priority: taskPrioritySchema,
  labels: z.array(z.string()).default([]),
  blockedReason: z.string().default(""),
  milestoneId: z.string().default(""),
  dependencies: z.array(z.string()).default([]),
  crossProjectDependencies: z.array(crossProjectDependencySchema).default([]),
  status: taskStatusSchema.optional(),
  activityLog: z.array(activityLogEntrySchema).default([]),
  isTemplate: z.boolean().default(false),
  templateId: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(""),
  milestones: z.array(milestoneSchema).default([]),
  tasks: z.array(taskSchema).default([]),
});

export const tabSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectIds: z.array(z.string()).min(1).max(2),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});

export const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectIds: z.array(z.string()),
  tabs: z.array(tabSchema),
  jiraDomain: z.string().optional(),
});
