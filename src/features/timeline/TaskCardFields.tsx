import { useState, useRef, useEffect } from "react";
import { Input, Textarea } from "../../components/ui/Input";
import { AssigneeCombobox } from "./AssigneeCombobox";
import { reassignAccountable, reassignTask } from "../../lib/assignees";
import { detectCycle } from "../../lib/dependencyGraph";
import type { Milestone, Person, Task } from "../../models/types";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export const Field = ({ label, children, className = "" }: FieldProps) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-medium text-gray-400">
      {label}
    </span>
    {children}
  </label>
);

type EditFieldsProps = {
  draft: Task;
  people: Person[];
  milestones: Milestone[];
  allTasks: Task[];
  onChange: (draft: Task) => void;
};

export const EditFields = ({
  draft,
  people,
  milestones,
  allTasks,
  onChange,
}: EditFieldsProps) => {
  const [depSearch, setDepSearch] = useState("");
  const [depOpen, setDepOpen] = useState(false);
  const depRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (depRef.current && !depRef.current.contains(e.target as Node)) {
        setDepOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Merge draft's pending dependencies into allTasks for accurate cycle detection
  const tasksWithDraftDeps = allTasks.map((t) =>
    t.id === draft.id ? { ...t, dependencies: draft.dependencies } : t,
  );
  const availableTasks = allTasks.filter(
    (t) =>
      t.id !== draft.id &&
      !draft.dependencies.includes(t.id) &&
      !detectCycle(tasksWithDraftDeps, draft.id, t.id),
  );

  const filteredAvailable = availableTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(depSearch.toLowerCase()) ||
      t.assignees[0]?.name.toLowerCase().includes(depSearch.toLowerCase()),
  );

  const selectedDeps = draft.dependencies
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean) as Task[];

  return (
    <div className="grid gap-3 rounded-2xl bg-black/16 p-3 ring-1 ring-white/8">
      <Field label="Task Title">
        <Input
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
        />
      </Field>
      <Field label="Responsible">
        <AssigneeCombobox
          value={draft.assignees[0]?.name ?? "Unassigned"}
          people={people}
          onChange={(assignee) => onChange(reassignTask(draft, assignee))}
        />
      </Field>
      <Field label="Accountable">
        <AssigneeCombobox
          value={draft.accountable[0]?.name ?? "Unassigned"}
          people={people}
          onChange={(accountable) =>
            onChange(reassignAccountable(draft, accountable))
          }
        />
      </Field>
      <Field label="Milestone">
        <select
          value={draft.milestoneId}
          onChange={(event) =>
            onChange({ ...draft, milestoneId: event.target.value })
          }
          className="w-full rounded-xl border-0 bg-white/8 px-3 py-2 text-sm text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-accent/60"
          aria-label="Select milestone"
        >
          <option value="">No milestone</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} —{" "}
              {m.date
                ? new Date(m.date + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "No date"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Jira Link">
        <Input
          value={draft.jiraLink}
          onChange={(event) =>
            onChange({ ...draft, jiraLink: event.target.value })
          }
          placeholder="https://..."
        />
      </Field>
      <Field label="Deliverable">
        <Input
          value={draft.deliverable}
          onChange={(event) =>
            onChange({ ...draft, deliverable: event.target.value })
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input
            type="date"
            value={draft.startDate}
            onChange={(event) =>
              onChange({ ...draft, startDate: event.target.value })
            }
          />
        </Field>
        <Field label="End Date">
          <Input
            type="date"
            value={draft.endDate}
            onChange={(event) =>
              onChange({ ...draft, endDate: event.target.value })
            }
          />
        </Field>
        <Field label="Expected Start">
          <Input
            type="date"
            value={draft.expectedStartDate}
            onChange={(event) =>
              onChange({ ...draft, expectedStartDate: event.target.value })
            }
          />
        </Field>
        <Field label="Expected End">
          <Input
            type="date"
            value={draft.expectedEndDate}
            onChange={(event) =>
              onChange({ ...draft, expectedEndDate: event.target.value })
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
            onChange({
              ...draft,
              progressPercent: Number(event.target.value),
            })
          }
          className="w-full accent-violet-400"
          aria-label="Progress percentage"
        />
      </Field>
      {/* Dependencies */}
      <Field label="Dependencies">
        <div ref={depRef} className="relative">
          <div
            className="flex min-h-[38px] cursor-pointer flex-wrap items-center gap-1.5 rounded-xl bg-white/8 px-3 py-1.5 ring-1 ring-white/10"
            onClick={() => setDepOpen(!depOpen)}
          >
            {selectedDeps.length === 0 && (
              <span className="text-sm text-slate-500">
                Select dependencies…
              </span>
            )}
            {selectedDeps.map((dep) => (
              <span
                key={dep.id}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200 ring-1 ring-cyan-400/20"
              >
                {dep.title.length > 18
                  ? dep.title.slice(0, 17) + "…"
                  : dep.title}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({
                      ...draft,
                      dependencies: draft.dependencies.filter(
                        (id) => id !== dep.id,
                      ),
                    });
                  }}
                  className="ml-0.5 text-cyan-300/60 hover:text-cyan-200"
                  aria-label={`Remove dependency: ${dep.title}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {depOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#0d1726] p-1 shadow-2xl ring-1 ring-white/10">
              <div className="sticky top-0 px-1 pb-1 pt-1">
                <Input
                  value={depSearch}
                  onChange={(e) => setDepSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="text-xs"
                  autoFocus
                />
              </div>
              {filteredAvailable.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">
                  {depSearch
                    ? "No matching tasks"
                    : "All tasks are already dependencies"}
                </div>
              ) : (
                filteredAvailable.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      onChange({
                        ...draft,
                        dependencies: [...draft.dependencies, task.id],
                      });
                      setDepSearch("");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/6"
                  >
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className="shrink-0 text-slate-500">
                      {task.assignees[0]?.name ?? "Unassigned"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Field>
      <Field label="Description">
        <Textarea
          value={draft.description}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
      </Field>
    </div>
  );
};
