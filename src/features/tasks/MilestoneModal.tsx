import { useState } from "react";
import {
  Flag,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { uid } from "../../lib/utils";
import { computeTaskStatus } from "../../lib/status";
import type { Milestone, Project, Task } from "../../models/types";

const MILESTONE_COLORS = [
  { name: "cyan", class: "bg-cyan-400" },
  { name: "violet", class: "bg-violet-400" },
  { name: "rose", class: "bg-rose-400" },
  { name: "amber", class: "bg-amber-400" },
  { name: "emerald", class: "bg-emerald-400" },
  { name: "blue", class: "bg-blue-400" },
];

type MilestoneModalProps = {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onSaveMilestone: (projectId: string, milestone: Milestone) => void;
  onDeleteMilestone: (projectId: string, milestoneId: string) => void;
};

export const MilestoneModal = ({
  open,
  projects,
  onClose,
  onSaveMilestone,
  onDeleteMilestone,
}: MilestoneModalProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("bg-cyan-400");

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const effectiveProjectId =
    selectedProjectId && projects.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : (projects[0]?.id ?? "");

  const project = projects.find((p) => p.id === effectiveProjectId) ?? null;

  if (!project || projects.length === 0) return null;

  const milestones = project.milestones;
  const tasks = project.tasks;

  const milestoneProgress = (milestoneId: string) => {
    const linked = tasks.filter((t) => t.milestoneId === milestoneId);
    if (!linked.length) return { done: 0, total: 0, percent: 0 };
    const done = linked.filter((t) => computeTaskStatus(t) === "Done").length;
    return {
      done,
      total: linked.length,
      percent: Math.round((done / linked.length) * 100),
    };
  };

  const linkedTasks = (milestoneId: string): Task[] =>
    tasks.filter((t) => t.milestoneId === milestoneId);

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return;
    const milestone: Milestone = {
      id: uid("ms"),
      title: newTitle.trim(),
      date: newDate,
      description: newDescription.trim(),
      color: newColor,
    };
    onSaveMilestone(project.id, milestone);
    setNewTitle("");
    setNewDate("");
    setNewDescription("");
    setNewColor("bg-cyan-400");
  };

  const handleStartEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setEditTitle(milestone.title);
    setEditDate(milestone.date);
    setEditDescription(milestone.description);
    setEditColor(milestone.color || "bg-cyan-400");
  };

  const handleSaveEdit = (milestone: Milestone) => {
    if (!editTitle.trim() || !editDate) return;
    onSaveMilestone(project.id, {
      ...milestone,
      title: editTitle.trim(),
      date: editDate,
      description: editDescription.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Milestones"
      description={`Manage milestones for ${project.name}`}
    >
      <div className="space-y-5">
        {/* Project selector */}
        {projects.length > 1 ? (
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.035] p-2 ring-1 ring-white/8">
            <ChevronDown className="ml-2 size-4 text-slate-400" />
            <select
              value={effectiveProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white outline-none"
              aria-label="Select project"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0d1726]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Add new milestone */}
        <div className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/8">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Add milestone
          </h3>
          <div className="space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Milestone title"
              aria-label="Milestone title"
            />
            <div className="flex gap-3">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                aria-label="Milestone date"
                className="flex-1"
              />
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label="Milestone description"
                className="flex-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {MILESTONE_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setNewColor(c.class)}
                    className={`size-5 rounded-full transition ring-1 ring-white/10 hover:ring-white/30 ${
                      c.class
                    } ${newColor === c.class ? "ring-2 ring-white" : ""}`}
                    aria-label={`Color: ${c.name}`}
                  />
                ))}
              </div>
              <Button onClick={handleAdd} className="px-3 py-1.5 text-xs">
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Milestone list */}
        {milestones.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.025] p-6 text-center text-sm text-slate-400 ring-1 ring-white/6">
            No milestones yet. Add your first milestone above.
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => {
              const progress = milestoneProgress(milestone.id);
              const linked = linkedTasks(milestone.id);
              const isEditing = editingId === milestone.id;
              const colorClass = milestone.color || "bg-cyan-400";

              return (
                <div
                  key={milestone.id}
                  className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/8"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Milestone title"
                        aria-label="Edit milestone title"
                      />
                      <div className="flex gap-3">
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          aria-label="Edit milestone date"
                          className="flex-1"
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          aria-label="Edit milestone description"
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {MILESTONE_COLORS.map((c) => (
                            <button
                              key={c.name}
                              onClick={() => setEditColor(c.class)}
                              className={`size-5 rounded-full transition ring-1 ring-white/10 hover:ring-white/30 ${
                                c.class
                              } ${editColor === c.class ? "ring-2 ring-white" : ""}`}
                              aria-label={`Color: ${c.name}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            className="px-3 py-1.5 text-xs"
                            onClick={handleCancelEdit}
                          >
                            <X className="size-3.5" />
                            Cancel
                          </Button>
                          <Button
                            className="px-3 py-1.5 text-xs"
                            onClick={() => handleSaveEdit(milestone)}
                          >
                            <Check className="size-3.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 flex size-8 items-center justify-center rounded-full ${colorClass}/20 ring-1 ring-white/10`}
                          >
                            <Flag
                              className={`size-4 ${colorClass.replace("bg-", "text-")}`}
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">
                              {milestone.title}
                            </h4>
                            <p className="text-xs text-slate-400">
                              {new Date(
                                milestone.date + "T00:00:00",
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            {milestone.description ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {milestone.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(milestone)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
                            aria-label={`Edit ${milestone.title}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              onDeleteMilestone(project.id, milestone.id)
                            }
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-rose-400"
                            aria-label={`Delete ${milestone.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {linked.length > 0 ? (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              {progress.done}/{progress.total} tasks done
                            </span>
                            <span>{progress.percent}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* Linked tasks */}
                      {linked.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {linked.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 text-xs text-slate-400"
                            >
                              <span className="size-1 rounded-full bg-white/20" />
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {linked.length > 3 ? (
                            <div className="text-[11px] text-slate-500">
                              +{linked.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-500">
                          No tasks linked — assign tasks to this milestone from
                          the task card.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
