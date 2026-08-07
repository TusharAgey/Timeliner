import { useState } from "react";
import { Pencil, Trash2, Plus, Zap } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Project } from "../../models/types";

type ManageProjectsModalProps = {
  open: boolean;
  projects: Project[];
  visibleProjectIds: string[];
  onClose: () => void;
  onCreateProject: (name: string, description?: string) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
};

export const ManageProjectsModal = ({
  open,
  projects,
  visibleProjectIds,
  onClose,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: ManageProjectsModalProps) => {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed, newDescription.trim());
    setNewName("");
    setNewDescription("");
  };

  const handleStartEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const project = projects.find((p) => p.id === editingId);
    if (!project) return;
    onUpdateProject({
      ...project,
      name: editName.trim(),
      description: editDescription.trim(),
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (projectId: string) => {
    onDeleteProject(projectId);
    setConfirmDelete(null);
    if (editingId === projectId) setEditingId(null);
  };

  const hasRunTheProd = projects.some((p) => p.slug === "run-the-prod");

  const panelLabel = (project: Project) => {
    const idx = visibleProjectIds.indexOf(project.id);
    if (idx === 0) return "Left panel";
    if (idx === 1) return "Right panel";
    return null;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage projects"
      description="Create, rename, or delete projects in this workspace."
    >
      <div className="mb-5 space-y-2">
        {projects.map((project) => {
          const panel = panelLabel(project);

          if (editingId === project.id) {
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-white/10 bg-white/4 p-4 space-y-3"
              >
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    className="text-xs px-3 py-1"
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancelEdit}
                    className="text-xs px-3 py-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={project.id}
              className="rounded-2xl border border-white/10 bg-white/4 p-4"
            >
              {confirmDelete === project.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-rose-300">
                    Delete "{project.name}" and all its {project.tasks.length}{" "}
                    tasks? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDelete(project.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-xs px-3 py-1"
                    >
                      Yes, delete
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-3 py-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {project.name}
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-slate-400">
                        {project.tasks.length} tasks
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {project.slug}
                      {panel ? ` · ${panel}` : " · unassigned"}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(project)}
                      className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
                      aria-label={`Rename ${project.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(project.id)}
                      className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                      aria-label={`Delete ${project.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No projects yet. Create one below.
          </p>
        ) : null}
      </div>

      {/* New project form */}
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/8 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-violet-200">New project</h4>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Project name"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="size-3.5" />
            Create
          </Button>
          {!hasRunTheProd ? (
            <Button
              variant="secondary"
              onClick={() => {
                setNewName("Run the prod");
                setNewDescription(
                  "Ad-hoc operations: hotfixes, prod incidents, deployments, and runbooks.",
                );
              }}
            >
              <Zap className="size-3.5" />
              Add "Run the prod"
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
