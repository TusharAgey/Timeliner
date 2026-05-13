import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { fullDate } from "../../lib/date";
import { computeTaskStatus, statusTone } from "../../lib/status";
import {
  getCurrentAssignee,
  getCurrentAccountable,
  getPreviousAssignees,
  getPreviousAccountables,
} from "../../lib/assignees";
import type { Person, Task, TaskPriority } from "../../models/types";
import { PILL_WIDTH } from "./timelineLayout";
import { EditFields } from "./TaskCardFields";
import { TaskCardDetails } from "./TaskCardDetails";

const priorityColor: Record<TaskPriority, string> = {
  Low: "bg-slate-500",
  Medium: "bg-blue-500",
  High: "bg-amber-500",
  Critical: "bg-rose-500",
};

const shiftDate = (value: string, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

type TaskCardProps = {
  task: Task;
  people: Person[];
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  side?: "left" | "right";
  accentClassName?: string;
  onEditingChange?: (editing: boolean) => void;
};

export const TaskCard = ({
  task,
  people,
  onSave,
  onDelete,
  side = "left",
  accentClassName = "bg-fuchsia-400",
  onEditingChange,
}: TaskCardProps) => {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(task);
  const currentAssignee = getCurrentAssignee(task);
  const currentAccountable = getCurrentAccountable(task);
  const previousAssignees = getPreviousAssignees(task);
  const previousAccountables = getPreviousAccountables(task);
  const handoffCount = previousAssignees.length + previousAccountables.length;
  const status = useMemo(() => computeTaskStatus(draft), [draft]);
  const expectedProgress = useMemo(() => {
    const now = new Date();
    const start = new Date(task.expectedStartDate);
    const end = new Date(task.expectedEndDate);
    const total = Math.max(1, end.getTime() - start.getTime());
    return Math.min(
      100,
      Math.max(0, ((now.getTime() - start.getTime()) / total) * 100),
    );
  }, [task.expectedEndDate, task.expectedStartDate]);
  const progressDelta = task.progressPercent - expectedProgress;
  const progressSignal =
    status === "Done"
      ? "Complete"
      : progressDelta >= 15
        ? "Ahead"
        : progressDelta <= -12
          ? "Behind"
          : "On track";
  const attentionClass =
    status === "Overdue"
      ? "shadow-[0_0_28px_rgba(244,63,94,0.12)] ring-rose-400/20 before:bg-rose-400"
      : status === "Delayed" || status === "At Risk"
        ? "shadow-[0_0_24px_rgba(251,146,60,0.10)] ring-amber-400/18 before:bg-amber-400"
        : side === "left"
          ? "before:bg-fuchsia-300/40"
          : "before:bg-emerald-300/40";
  const laneGradient =
    side === "left"
      ? "bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/5 to-transparent"
      : "bg-gradient-to-br from-emerald-500/10 via-pink-500/5 to-transparent";
  const editState = editing
    ? "-translate-y-1 bg-white/[0.07] shadow-[0_22px_54px_rgba(2,8,23,0.36)] ring-white/18"
    : "bg-white/[0.035] shadow-[0_10px_24px_rgba(2,8,23,0.18)] ring-white/6 hover:-translate-y-1 hover:bg-white/[0.05] hover:shadow-[0_16px_32px_rgba(2,8,23,0.26)]";

  return (
    <article
      className={`group relative overflow-visible rounded-[20px] p-3 ring-1 transition-all duration-200 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 ${laneGradient} ${editState} ${attentionClass}`}
    >
      <div
        className={`absolute top-1/2 ${side === "left" ? "right-0 translate-x-full" : "left-0 -translate-x-full"} flex -translate-y-1/2 items-center`}
        style={{ width: PILL_WIDTH }}
      >
        {side === "right" ? (
          <div
            className={`h-2.5 w-2.5 rounded-full ${accentClassName} shadow-[0_0_12px_rgba(255,255,255,0.15)]`}
          />
        ) : null}
        <div className="h-px flex-1 bg-white/12" />
        {side === "left" ? (
          <div
            className={`h-2.5 w-2.5 rounded-full ${accentClassName} shadow-[0_0_12px_rgba(255,255,255,0.15)]`}
          />
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block size-2 rounded-full ${priorityColor[task.priority]}`}
                title={`Priority: ${task.priority}`}
              />
              <div
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone[status]}`}
              >
                {status}
              </div>
            </div>

            <div className="text-[11px] text-muted">
              {fullDate(task.startDate)} → {fullDate(task.endDate)}
            </div>
          </div>
          {editing ? (
            <div className="mt-4">
              <EditFields draft={draft} people={people} onChange={setDraft} />
            </div>
          ) : (
            <h4 className="mt-2 text-[14px] font-semibold leading-5 text-white">
              {task.title}
            </h4>
          )}
        </div>
        <Button
          variant="ghost"
          className="rounded-full p-2 text-muted opacity-0 transition group-hover:opacity-100"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete task: ${task.title}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-2 grid gap-2 text-[13px] text-slate-300">
        {!editing && (
          <>
            <div className="flex items-center gap-2 text-[13px] text-slate-300">
              <span className="grid size-6 place-items-center rounded-full bg-white/8 text-[10px] font-semibold text-slate-300 ring-1 ring-white/8">
                {initials(currentAssignee)}
              </span>
              <span title="Responsible">{currentAssignee}</span>
              <span className="text-muted">·</span>
              <span className="text-slate-500" title="Accountable">
                {currentAccountable}
              </span>
              {handoffCount ? (
                <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-white/6">
                  {handoffCount} handoff{handoffCount === 1 ? "" : "s"}
                </span>
              ) : null}
              <span className="text-muted">·</span>
              {task.jiraLink ? (
                <a
                  href={task.jiraLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted transition hover:text-white"
                >
                  Jira <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <span className="text-muted">No Jira</span>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted">
                <span>Progress</span>
                <span>
                  {progressSignal} · {task.progressPercent}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8">
                <div
                  className="h-1.5 rounded-full bg-accent transition-all"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>
            </div>
            {expanded && (
              <TaskCardDetails task={task} handoffCount={handoffCount} />
            )}
            {task.dependencies.length ||
            task.blockedReason ||
            task.crossProjectDependencies.length ? (
              <div className="rounded-xl bg-white/[0.025] px-2.5 py-1.5 text-xs text-slate-400 ring-1 ring-white/6">
                {task.blockedReason
                  ? `Blocked: ${task.blockedReason}`
                  : task.dependencies.length > 0
                    ? `${task.dependencies.length} dependency${task.dependencies.length === 1 ? "" : "ies"}`
                    : `${task.crossProjectDependencies.length} cross-project dep${task.crossProjectDependencies.length === 1 ? "" : "s"}`}
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setEditing((value) => {
                onEditingChange?.(!value);
                return !value;
              });
              setDraft(task);
            }}
          >
            {editing ? "Cancel" : "Edit inline"}
          </Button>
          {!editing ? (
            <Button
              variant="ghost"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Less" : "Details"}{" "}
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          ) : null}
        </div>
        {editing ? (
          <Button
            onClick={() => {
              onSave({ ...draft, status });
              setEditing(false);
              onEditingChange?.(false);
            }}
          >
            Save
          </Button>
        ) : null}
        {!editing ? (
          <div className="flex translate-y-1 items-center gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
            <button
              className="rounded-full bg-white/6 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              onClick={() =>
                onSave({
                  ...task,
                  progressPercent: Math.min(100, task.progressPercent + 10),
                })
              }
              aria-label="Increase progress by 10%"
            >
              +10%
            </button>
            <button
              className="rounded-full bg-white/6 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              onClick={() =>
                onSave({
                  ...task,
                  startDate: shiftDate(task.startDate, 1),
                  endDate: shiftDate(task.endDate, 1),
                })
              }
              aria-label="Shift dates by 1 day"
            >
              +1d
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
};
