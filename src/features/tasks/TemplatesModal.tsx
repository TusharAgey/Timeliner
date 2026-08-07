import { useState } from "react";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Play from "lucide-react/dist/esm/icons/play";

import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { uid } from "../../lib/utils";
import { nextDays } from "../../lib/date";
import type { TaskTemplate, Project } from "../../models/types";

type TemplatesModalProps = {
  open: boolean;
  templates: TaskTemplate[];
  projects: Project[];
  onClose: () => void;
  onSaveTemplate: (template: TaskTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onInstantiate: (
    templateId: string,
    projectId: string,
    startDate: string,
  ) => void;
};

const emptyTemplate = (): TaskTemplate => ({
  id: uid("template"),
  name: "",
  title: "",
  description: "",
  assignees: [],
  accountable: [],
  deliverable: "",
  priority: "Medium",
  labels: [],
  durationDays: 7,
});

export const TemplatesModal = ({
  open,
  templates,
  projects,
  onClose,
  onSaveTemplate,
  onDeleteTemplate,
  onInstantiate,
}: TemplatesModalProps) => {
  const [editing, setEditing] = useState<TaskTemplate>(emptyTemplate());
  const [showForm, setShowForm] = useState(false);
  const [instantiateTemplateId, setInstantiateTemplateId] = useState<
    string | null
  >(null);
  const [instantiateProjectId, setInstantiateProjectId] = useState("");
  const [instantiateStartDate, setInstantiateStartDate] = useState(nextDays(1));

  const handleSave = () => {
    if (!editing.name || !editing.title) return;
    onSaveTemplate(editing);
    setEditing(emptyTemplate());
    setShowForm(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task templates"
      description="Create reusable task templates that can be instantiated into any project."
    >
      <div className="space-y-4">
        {templates.length === 0 && !showForm ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No templates yet. Create one to quickly add recurring task patterns.
          </div>
        ) : null}

        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-white/10 bg-white/4 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{template.name}</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {template.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white/6 px-2 py-0.5">
                    {template.priority}
                  </span>
                  <span className="rounded-full bg-white/6 px-2 py-0.5">
                    {template.durationDays} days
                  </span>
                  {template.assignees.length > 0 ? (
                    <span className="rounded-full bg-white/6 px-2 py-0.5">
                      {template.assignees.map((a) => a.name).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="rounded-full p-2"
                  onClick={() => {
                    setInstantiateTemplateId(template.id);
                    setInstantiateProjectId(projects[0]?.id ?? "");
                    setInstantiateStartDate(nextDays(1));
                  }}
                  title="Instantiate into project"
                >
                  <Play className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full p-2 text-rose-400 hover:text-rose-300"
                  onClick={() => onDeleteTemplate(template.id)}
                  title="Delete template"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Instantiate form inline */}
            {instantiateTemplateId === template.id ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-black/18 p-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">
                    Project
                  </label>
                  <select
                    value={instantiateProjectId}
                    onChange={(e) => setInstantiateProjectId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <label className="mb-1 block text-xs text-slate-500">
                    Start date
                  </label>
                  <Input
                    type="date"
                    value={instantiateStartDate}
                    onChange={(e) => setInstantiateStartDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    onInstantiate(
                      template.id,
                      instantiateProjectId,
                      instantiateStartDate,
                    );
                    setInstantiateTemplateId(null);
                  }}
                >
                  <Play className="size-3.5" />
                  Create task
                </Button>
              </div>
            ) : null}
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/4 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              New template
            </h3>
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Template name (e.g. Sprint task)"
            />
            <Input
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
              placeholder="Task title"
            />
            <Textarea
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              placeholder="Description"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Priority
                </label>
                <select
                  value={editing.priority}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priority: e.target.value as TaskTemplate["priority"],
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Duration (days)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editing.durationDays}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      durationDays: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save template
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(emptyTemplate());
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full"
            variant="secondary"
          >
            <Plus className="size-4" />
            New template
          </Button>
        )}
      </div>
    </Modal>
  );
};
