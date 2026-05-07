import {
  differenceInCalendarDays,
  format,
  isWithinInterval,
  subDays,
} from "date-fns";
import type { Milestone, Project, Task, TaskStatus } from "../models/types";
import { parseDate, today, weekRange } from "./date";
import { computeTaskStatus } from "./status";

type TaskWithProject = {
  task: Task;
  project: Project;
  status: TaskStatus;
  expectedProgress: number;
  progressDelta: number;
  daysUntilDeadline: number;
};

export type HealthTone = "green" | "yellow" | "red";

export type ProjectHealth = {
  projectId: string;
  projectName: string;
  score: number;
  tone: HealthTone;
  label: "Healthy" | "Caution" | "Critical";
  reasons: string[];
};

export type MilestoneInsight = {
  id: string;
  title: string;
  projectName: string;
  date: string;
  label: string;
  status: "On track" | "At risk" | "Delayed";
};

export type ProjectIntelligenceSummary = {
  highlights: string[];
  lowlights: string[];
  risks: string[];
  milestones: MilestoneInsight[];
  health: ProjectHealth[];
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const expectedProgressForTask = (task: Task) => {
  const start = parseDate(task.expectedStartDate);
  const end = parseDate(task.expectedEndDate);
  const total = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const elapsed = clamp(differenceInCalendarDays(today(), start) + 1, 0, total);
  return (elapsed / total) * 100;
};

const plural = (
  count: number,
  singular: string,
  pluralLabel = `${singular}s`,
) => `${count} ${count === 1 ? singular : pluralLabel}`;

const bySoonestDeadline = (a: TaskWithProject, b: TaskWithProject) =>
  parseDate(a.task.endDate).getTime() - parseDate(b.task.endDate).getTime();

const uniqueFirst = (items: string[], limit: number, fallback: string) => {
  const unique = Array.from(new Set(items.filter(Boolean)));
  return unique.length ? unique.slice(0, limit) : [fallback];
};

export const projectSummary = (project: Project) => {
  const range = weekRange();
  const statuses = project.tasks.map(computeTaskStatus);
  return {
    totalTasks: project.tasks.length,
    done: statuses.filter((status) => status === "Done").length,
    overdue: statuses.filter((status) => status === "Overdue").length,
    atRisk: statuses.filter(
      (status) => status === "At Risk" || status === "Delayed",
    ).length,
    startingThisWeek: project.tasks.filter((task) =>
      isWithinInterval(parseDate(task.startDate), {
        start: range.start,
        end: range.end,
      }),
    ).length,
    milestoneCount: project.milestones.length,
  };
};

export const aggregateVisibleSummary = (projects: Project[]) => {
  const allTasks = projects.flatMap((project) => project.tasks);
  const statuses = allTasks.map(computeTaskStatus);
  const range = weekRange();
  const allMilestones = projects
    .flatMap((project) => project.milestones)
    .map((milestone) => ({ ...milestone, parsed: parseDate(milestone.date) }))
    .filter((milestone) => milestone.parsed >= range.start)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());

  return {
    overdue: statuses.filter((status) => status === "Overdue").length,
    atRisk: statuses.filter(
      (status) => status === "At Risk" || status === "Delayed",
    ).length,
    startsToday: allTasks.filter(
      (task) => task.startDate === new Date().toISOString().slice(0, 10),
    ).length,
    nextMilestoneLabel: allMilestones[0]
      ? `${Math.max(0, Math.ceil((allMilestones[0].parsed.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))}d`
      : "—",
  };
};

const buildTaskContext = (projects: Project[]): TaskWithProject[] =>
  projects.flatMap((project) =>
    project.tasks.map((task) => {
      const expectedProgress = expectedProgressForTask(task);
      return {
        task,
        project,
        status: computeTaskStatus(task),
        expectedProgress,
        progressDelta: task.progressPercent - expectedProgress,
        daysUntilDeadline: differenceInCalendarDays(
          parseDate(task.endDate),
          today(),
        ),
      };
    }),
  );

const milestoneStatus = (
  milestone: Milestone,
  projectTasks: Task[],
): MilestoneInsight["status"] => {
  const date = parseDate(milestone.date);
  const relatedTasks = projectTasks.filter(
    (task) =>
      parseDate(task.endDate) <= date && computeTaskStatus(task) !== "Done",
  );
  if (date < today() && relatedTasks.length) return "Delayed";
  if (
    relatedTasks.some((task) =>
      ["Overdue", "Delayed", "At Risk"].includes(computeTaskStatus(task)),
    )
  ) {
    return "At risk";
  }
  return "On track";
};

export const computeProjectHealth = (project: Project): ProjectHealth => {
  let score = 100;
  const reasons: string[] = [];
  const contexts = buildTaskContext([project]);
  const overdue = contexts.filter(({ status }) => status === "Overdue").length;
  const delayed = contexts.filter(({ status }) => status === "Delayed").length;
  const behind = contexts.filter(
    ({ progressDelta }) => progressDelta < -12,
  ).length;
  const lowNearDeadline = contexts.filter(
    ({ task, daysUntilDeadline }) =>
      daysUntilDeadline >= 0 &&
      daysUntilDeadline <= 2 &&
      task.progressPercent < 50,
  ).length;

  score -= overdue * 10;
  score -= delayed * 5;
  if (behind) score -= 5;
  score -= lowNearDeadline * 3;

  if (overdue) reasons.push(`${plural(overdue, "overdue task")}`);
  if (delayed) reasons.push(`${plural(delayed, "delayed task")}`);
  if (behind) reasons.push("progress below expected pace");
  if (lowNearDeadline)
    reasons.push(`${plural(lowNearDeadline, "low-progress deadline")}`);

  const finalScore = clamp(score);
  const tone: HealthTone =
    finalScore >= 80 ? "green" : finalScore >= 50 ? "yellow" : "red";
  const label =
    tone === "green" ? "Healthy" : tone === "yellow" ? "Caution" : "Critical";

  return {
    projectId: project.id,
    projectName: project.name,
    score: finalScore,
    tone,
    label,
    reasons: reasons.slice(0, 2),
  };
};

export const computeProjectIntelligenceSummary = (
  projects: Project[],
): ProjectIntelligenceSummary => {
  const contexts = buildTaskContext(projects);
  const sevenDaysAgo = subDays(today(), 7);
  const upcomingMilestones = projects
    .flatMap((project) =>
      project.milestones.map((milestone) => ({ milestone, project })),
    )
    .filter(({ milestone }) => parseDate(milestone.date) >= today())
    .sort(
      (a, b) =>
        parseDate(a.milestone.date).getTime() -
        parseDate(b.milestone.date).getTime(),
    );

  const completedRecently = contexts.filter(
    ({ task, status }) =>
      status === "Done" && parseDate(task.endDate) >= sevenDaysAgo,
  );
  const ahead = contexts
    .filter(({ status }) => status === "Ahead")
    .sort(bySoonestDeadline);
  const nearingCompletion = contexts
    .filter(
      ({ task, status }) =>
        status !== "Done" &&
        task.progressPercent >= 75 &&
        task.progressPercent < 100,
    )
    .sort((a, b) => b.task.progressPercent - a.task.progressPercent);
  const achievedMilestones = projects.flatMap((project) =>
    project.milestones.filter(
      (milestone) =>
        parseDate(milestone.date) >= sevenDaysAgo &&
        parseDate(milestone.date) <= today(),
    ),
  );

  const overdueByProject = projects
    .map((project) => ({
      project,
      count: project.tasks.filter(
        (task) => computeTaskStatus(task) === "Overdue",
      ).length,
    }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);
  const delayed = contexts
    .filter(({ status }) => status === "Delayed")
    .sort((a, b) => a.progressDelta - b.progressDelta);
  const lowProgressNearDeadline = contexts
    .filter(
      ({ task, daysUntilDeadline }) =>
        daysUntilDeadline >= 0 &&
        daysUntilDeadline <= 5 &&
        task.progressPercent < 20,
    )
    .sort(bySoonestDeadline);
  const blockedDependencies = contexts.filter(
    ({ task, status }) =>
      task.dependencies.length > 0 &&
      ["Delayed", "At Risk", "Overdue"].includes(status),
  );
  const deadlineBuckets = contexts.reduce<Record<string, TaskWithProject[]>>(
    (buckets, context) => {
      if (context.status === "Done") return buckets;
      const key = context.task.endDate;
      buckets[key] = [...(buckets[key] ?? []), context];
      return buckets;
    },
    {},
  );
  const clusteredDeadline = Object.entries(deadlineBuckets)
    .filter(([, items]) => items.length >= 3)
    .sort(([, a], [, b]) => b.length - a.length)[0];

  const highlights = uniqueFirst(
    [
      ahead[0]
        ? `${ahead[0].task.title} is ahead by ${Math.max(1, Math.round(ahead[0].progressDelta))}%`
        : "",
      nearingCompletion[0]
        ? `${nearingCompletion[0].task.title} is at ${nearingCompletion[0].task.progressPercent}% completion`
        : "",
      completedRecently.length
        ? `${plural(completedRecently.length, "task")} completed in the last 7 days`
        : "",
      achievedMilestones.length
        ? `${plural(achievedMilestones.length, "milestone")} reached this week`
        : "",
      upcomingMilestones[0]
        ? `Next milestone: ${upcomingMilestones[0].milestone.title} on ${format(parseDate(upcomingMilestones[0].milestone.date), "MMM d")}`
        : "",
    ],
    5,
    "No strong positive signals yet — execution needs clearer momentum.",
  );

  const lowlights = uniqueFirst(
    [
      overdueByProject[0]
        ? `${plural(overdueByProject[0].count, "task")} overdue in ${overdueByProject[0].project.name}`
        : "",
      delayed[0]
        ? `${delayed[0].task.title} is behind expected pace by ${Math.abs(Math.round(delayed[0].progressDelta))}%`
        : "",
      lowProgressNearDeadline.length
        ? `${plural(lowProgressNearDeadline.length, "task")} below 20% progress near deadline`
        : "",
      contexts.filter(
        ({ progressDelta, status }) => status !== "Done" && progressDelta < -12,
      ).length
        ? `${plural(contexts.filter(({ progressDelta, status }) => status !== "Done" && progressDelta < -12).length, "task")} tracking behind expected time elapsed`
        : "",
    ],
    5,
    "No overdue or materially delayed work detected across visible projects.",
  );

  const risks = uniqueFirst(
    [
      clusteredDeadline
        ? `${plural(clusteredDeadline[1].length, "task")} converge near ${format(parseDate(clusteredDeadline[0]), "MMM d")}`
        : "",
      blockedDependencies.length
        ? `${blockedDependencies[0].task.title} has delayed dependency exposure`
        : "",
      delayed[0]
        ? `Risk of ${delayed[0].project.name} delay if ${delayed[0].task.title} slips further`
        : "",
      lowProgressNearDeadline.length
        ? `${plural(lowProgressNearDeadline.length, "near-term task")} may miss deadline without intervention`
        : "",
    ],
    5,
    "No concentrated forward-looking risks detected right now.",
  );

  return {
    highlights,
    lowlights,
    risks,
    milestones: upcomingMilestones
      .slice(0, 5)
      .map(({ milestone, project }) => ({
        id: milestone.id,
        title: milestone.title,
        projectName: project.name,
        date: milestone.date,
        label: format(parseDate(milestone.date), "MMM d"),
        status: milestoneStatus(milestone, project.tasks),
      })),
    health: projects.map(computeProjectHealth),
  };
};
