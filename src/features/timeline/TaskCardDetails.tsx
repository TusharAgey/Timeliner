import History from "lucide-react/dist/esm/icons/history";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import type { Task } from "../../models/types";
import { getAssigneeHistory, getAccountableHistory } from "../../lib/assignees";

type TaskCardDetailsProps = {
  task: Task;
  handoffCount: number;
  allTasks?: Task[];
};

export const TaskCardDetails = ({
  task,
  handoffCount,
  allTasks = [],
}: TaskCardDetailsProps) => {
  const resolvedDeps = task.dependencies
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean) as Task[];

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-300/90">
        {task.description || "No description yet."}
      </p>

      {/* Intra-project dependencies */}
      {resolvedDeps.length > 0 ? (
        <div className="rounded-xl bg-white/[0.025] px-2.5 py-2 text-xs text-slate-400 ring-1 ring-white/6">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <ArrowRight className="size-3" /> Depends on
          </div>
          {resolvedDeps.map((dep) => (
            <div key={dep.id} className="flex items-center gap-2 py-0.5">
              <span className="size-1.5 rounded-full bg-cyan-400/50" />
              <span>{dep.title}</span>
              <span className="text-slate-500">
                — {dep.assignees[0]?.name ?? "Unassigned"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ownership history */}
      {handoffCount ? (
        <div className="rounded-xl bg-white/[0.025] px-2.5 py-2 text-xs text-slate-400 ring-1 ring-white/6">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <History className="size-3" /> Ownership history
          </div>
          {getAssigneeHistory(task).map((entry) => (
            <div key={`${entry.name}-${entry.from}-${entry.to ?? "now"}`}>
              Responsible — {entry.name}: {entry.from} → {entry.to ?? "Now"}
            </div>
          ))}
          {getAccountableHistory(task).map((entry) => (
            <div key={`a-${entry.name}-${entry.from}-${entry.to ?? "now"}`}>
              Accountable — {entry.name}: {entry.from} → {entry.to ?? "Now"}
            </div>
          ))}
        </div>
      ) : null}

      {/* Cross-project dependencies */}
      {task.crossProjectDependencies.length > 0 ? (
        <div className="rounded-xl bg-white/[0.025] px-2.5 py-2 text-xs text-slate-400 ring-1 ring-white/6">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <GitBranch className="size-3" /> Cross-project dependencies
          </div>
          {task.crossProjectDependencies.map((dep, i) => (
            <div key={`${dep.projectId}-${dep.taskId}-${i}`}>
              {dep.label || `Task in project ${dep.projectId}`}
            </div>
          ))}
        </div>
      ) : null}

      {/* Activity log */}
      {task.activityLog.length > 0 ? (
        <div className="rounded-xl bg-white/[0.025] px-2.5 py-2 text-xs text-slate-400 ring-1 ring-white/6">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <History className="size-3" /> Activity log
          </div>
          {task.activityLog
            .slice(-5)
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="flex gap-2 py-0.5">
                <span className="shrink-0 text-slate-500">
                  {entry.timestamp
                    ? new Date(entry.timestamp).toLocaleDateString()
                    : "—"}
                </span>
                <span>
                  {entry.actor} {entry.action}
                  {entry.field ? ` ${entry.field}` : ""}
                </span>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
};
