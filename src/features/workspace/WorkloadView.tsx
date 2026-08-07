import { useMemo } from "react";
import X from "lucide-react/dist/esm/icons/x";

import { Button } from "../../components/ui/Button";
import { computeTaskStatus } from "../../lib/status";
import { fullDate } from "../../lib/date";
import { getCurrentAssignee } from "../../lib/assignees";
import type { Person, Project } from "../../models/types";

type WorkloadViewProps = {
  projects: Project[];
  people: Person[];
  onClose: () => void;
};

export const WorkloadView = ({ projects, onClose }: WorkloadViewProps) => {
  const workload = useMemo(() => {
    const allTasks = projects.flatMap((project) =>
      project.tasks.map((task) => ({ ...task, projectName: project.name })),
    );

    const assigneeMap = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      const assignee = getCurrentAssignee(task);
      const existing = assigneeMap.get(assignee) ?? [];
      existing.push(task);
      assigneeMap.set(assignee, existing);
    }

    return Array.from(assigneeMap.entries())
      .map(([name, tasks]) => ({
        name,
        tasks,
        overdue: tasks.filter((t) => computeTaskStatus(t) === "Overdue").length,
        atRisk: tasks.filter(
          (t) =>
            computeTaskStatus(t) === "At Risk" ||
            computeTaskStatus(t) === "Delayed",
        ).length,
        total: tasks.length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [projects]);

  return (
    <div className="rounded-[24px] bg-white/[0.035] p-6 ring-1 ring-white/8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Workload view
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tasks grouped by assignee across visible projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose} className="px-4">
            ← Back to timeline
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full p-2"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {workload.map((entry) => (
          <div
            key={entry.name}
            className="rounded-2xl bg-black/18 p-4 ring-1 ring-white/6"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/8">
                  {entry.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <p className="font-medium text-white">{entry.name}</p>
                  <p className="text-xs text-slate-500">
                    {entry.total} task{entry.total === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                {entry.overdue > 0 ? (
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-1 font-medium text-rose-200">
                    {entry.overdue} overdue
                  </span>
                ) : null}
                {entry.atRisk > 0 ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-200">
                    {entry.atRisk} at risk
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              {entry.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-200">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {task.projectName} · {fullDate(task.startDate)} →{" "}
                      {fullDate(task.endDate)}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      computeTaskStatus(task) === "Overdue"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                        : computeTaskStatus(task) === "At Risk" ||
                            computeTaskStatus(task) === "Delayed"
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-slate-400/20 bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {computeTaskStatus(task)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
