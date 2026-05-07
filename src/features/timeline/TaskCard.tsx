import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { fullDate } from "../../lib/date";
import { computeTaskStatus, statusTone } from "../../lib/status";
import {
  getAssigneeHistory,
  getAccountableHistory,
  getCurrentAssignee,
  getCurrentAccountable,
  getPreviousAssignees,
  getPreviousAccountables,
  reassignAccountable,
  reassignTask,
} from "../../lib/assignees";
import type { Person, Task } from "../../models/types";
import { PILL_WIDTH } from "./timelineLayout";

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

type FieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

const Field = ({ label, children, className = "" }: FieldProps) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-medium text-gray-400">
      {label}
    </span>
    {children}
  </label>
);

type AssigneeComboboxProps = {
  value: string;
  people: Person[];
  onChange: (value: string) => void;
};

const AssigneeCombobox = ({
  value,
  people,
  onChange,
}: AssigneeComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const matches = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) =>
      [person.name, person.role].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [people, searchValue]);
  const showCreate =
    searchValue.trim().length > 0 &&
    !people.some(
      (person) =>
        person.name.toLowerCase() === searchValue.trim().toLowerCase(),
    );
  const options = showCreate ? [...matches, null] : matches;

  const selectOption = (person: Person | null) => {
    onChange(person ? person.name : searchValue.trim());
    setOpen(false);
    setSearchValue("");
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(0);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onFocus={() => {
          setSearchValue("");
          setOpen(true);
        }}
        onChange={(event) => {
          setSearchValue(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            setOpen(true);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, options.length - 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && open && options.length) {
            event.preventDefault();
            selectOption(options[activeIndex]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search assignee"
        className="pr-10"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      {open ? (
        <div
          className="absolute left-0 right-0 top-12 z-[80] overflow-hidden rounded-2xl border border-slate-700 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.72)] ring-1 ring-black"
          style={{ backgroundColor: "#020617" }}
        >
          <div
            className="absolute inset-0 -z-10"
            style={{ backgroundColor: "#020617" }}
          />
          {options.length ? (
            options.map((person, index) => (
              <button
                key={person?.id ?? "create-assignee"}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(person)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${index === activeIndex ? "bg-slate-800" : "bg-slate-950 hover:bg-slate-900"}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-slate-200 ring-1 ring-white/8">
                  {person ? initials(person.name) : "+"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-100">
                    {person ? person.name : `Add “${searchValue.trim()}”`}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {person ? person.role : "Use this new assignee name"}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">
              No people found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

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
  const draftAssignee = getCurrentAssignee(draft);
  const draftAccountable = getCurrentAccountable(draft);
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
            <div
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone[status]}`}
            >
              {status}
            </div>
            <div className="text-[11px] text-muted">
              {fullDate(task.startDate)} → {fullDate(task.endDate)}
            </div>
          </div>
          {editing ? (
            <div className="mt-4 rounded-2xl bg-black/16 p-3 ring-1 ring-white/8">
              <Field label="Task Title">
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </Field>
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
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-2 grid gap-2 text-[13px] text-slate-300">
        {editing ? (
          <div className="grid gap-3 rounded-2xl bg-black/16 p-3 ring-1 ring-white/8">
            <Field label="Responsible">
              <AssigneeCombobox
                value={draftAssignee}
                people={people}
                onChange={(assignee) => setDraft(reassignTask(draft, assignee))}
              />
            </Field>
            <Field label="Accountable">
              <AssigneeCombobox
                value={draftAccountable}
                people={people}
                onChange={(accountable) =>
                  setDraft(reassignAccountable(draft, accountable))
                }
              />
            </Field>
            <Field label="Jira Link">
              <Input
                value={draft.jiraLink}
                onChange={(event) =>
                  setDraft({ ...draft, jiraLink: event.target.value })
                }
                placeholder="https://..."
              />
            </Field>
            <Field label="Deliverable">
              <Input
                value={draft.deliverable}
                onChange={(event) =>
                  setDraft({ ...draft, deliverable: event.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft({ ...draft, startDate: event.target.value })
                  }
                />
              </Field>
              <Field label="End Date">
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) =>
                    setDraft({ ...draft, endDate: event.target.value })
                  }
                />
              </Field>
              <Field label="Expected Start">
                <Input
                  type="date"
                  value={draft.expectedStartDate}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      expectedStartDate: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Expected End">
                <Input
                  type="date"
                  value={draft.expectedEndDate}
                  onChange={(event) =>
                    setDraft({ ...draft, expectedEndDate: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label={`Progress (%) — ${draft.progressPercent}%`}>
              <input
                type="range"
                min="0"
                max="100"
                value={draft.progressPercent}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    progressPercent: Number(event.target.value),
                  })
                }
                className="w-full accent-violet-400"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </Field>
          </div>
        ) : (
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
            {expanded ? (
              <div className="space-y-2">
                <p className="text-sm leading-6 text-slate-300/90">
                  {task.description || "No description yet."}
                </p>
                {handoffCount ? (
                  <div className="rounded-xl bg-white/[0.025] px-2.5 py-2 text-xs text-slate-400 ring-1 ring-white/6">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Ownership history
                    </div>
                    {getAssigneeHistory(task).map((entry) => (
                      <div
                        key={`${entry.name}-${entry.from}-${entry.to ?? "now"}`}
                      >
                        Responsible — {entry.name}: {entry.from} →{" "}
                        {entry.to ?? "Now"}
                      </div>
                    ))}
                    {getAccountableHistory(task).map((entry) => (
                      <div
                        key={`a-${entry.name}-${entry.from}-${entry.to ?? "now"}`}
                      >
                        Accountable — {entry.name}: {entry.from} →{" "}
                        {entry.to ?? "Now"}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {task.dependencies.length || task.blockedReason ? (
              <div className="rounded-xl bg-white/[0.025] px-2.5 py-1.5 text-xs text-slate-400 ring-1 ring-white/6">
                {task.blockedReason
                  ? `Blocked: ${task.blockedReason}`
                  : `${task.dependencies.length} dependency${task.dependencies.length === 1 ? "" : "ies"}`}
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
            >
              +1d
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
};
