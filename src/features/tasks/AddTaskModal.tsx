import { useMemo, useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { parseNaturalLanguageTask } from "../../lib/parser";
import { nextDays } from "../../lib/date";
import type { Project, Task } from "../../models/types";
import { uid } from "../../lib/utils";
import {
  getCurrentAssignee,
  makeAccountableHistory,
  makeAssigneeHistory,
} from "../../lib/assignees";

type AddTaskModalProps = {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onSubmit: (projectId: string, task: Task) => void;
  onSubmitNatural: (projectId: string, input: string) => void;
};

const emptyTask = (): Task => ({
  id: uid("task"),
  title: "",
  description: "",
  assignees: makeAssigneeHistory("Unassigned", nextDays(1)),
  accountable: makeAccountableHistory("Unassigned", nextDays(1)),
  jiraLink: "",
  deliverable: "",
  startDate: nextDays(1),
  endDate: nextDays(7),
  expectedStartDate: nextDays(1),
  expectedEndDate: nextDays(7),
  progressPercent: 0,
  priority: "Medium",
  labels: [],
  blockedReason: "",
  milestoneId: "",
  dependencies: [],
  crossProjectDependencies: [],
  status: "Not Started",
  activityLog: [],
  isTemplate: false,
});

export const AddTaskModal = ({
  open,
  projects,
  onClose,
  onSubmit,
  onSubmitNatural,
}: AddTaskModalProps) => {
  const [naturalInput, setNaturalInput] = useState(
    "Add API migration for Ravi next Monday to Apr 30 jira ENG-123",
  );
  const [manual, setManual] = useState<Task>(emptyTask());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const effectiveProjectId =
    selectedProjectId && projects.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : (projects[0]?.id ?? "");

  const project = projects.find((p) => p.id === effectiveProjectId) ?? null;

  const preview = useMemo(
    () => parseNaturalLanguageTask(naturalInput),
    [naturalInput],
  );

  if (!project || projects.length === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add task"
      description={`Add work into ${project.name} with quick parsing or manual entry.`}
    >
      {/* Project selector */}
      {projects.length > 1 ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/[0.035] p-2 ring-1 ring-white/8">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/4 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Natural language
          </h3>
          <Textarea
            value={naturalInput}
            onChange={(event) => setNaturalInput(event.target.value)}
            placeholder="Add API migration for Ravi next Monday to Apr 30 jira ENG-123"
          />
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/8 p-4 text-sm text-slate-200">
            <p className="font-medium text-violet-100">
              Parser preview ({preview.confidence})
            </p>
            <p className="mt-2">{preview.title}</p>
            <p className="mt-1 text-muted">
              {getCurrentAssignee(preview as Task)} • {preview.startDate} →{" "}
              {preview.endDate}
            </p>
          </div>
          <Button
            onClick={() => {
              onSubmitNatural(project.id, naturalInput);
              setNaturalInput(
                "Add API migration for Ravi next Monday to Apr 30 jira ENG-123",
              );
              setManual(emptyTask());
              onClose();
            }}
            className="w-full"
          >
            Add from sentence
          </Button>
        </section>
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/4 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Manual fallback
          </h3>
          <Input
            value={manual.title}
            onChange={(event) =>
              setManual({ ...manual, title: event.target.value })
            }
            placeholder="Task title"
          />
          <Input
            value={getCurrentAssignee(manual)}
            onChange={(event) =>
              setManual({
                ...manual,
                assignees: makeAssigneeHistory(
                  event.target.value,
                  manual.startDate,
                ),
              })
            }
            placeholder="Assignee"
          />
          <Input
            value={manual.jiraLink}
            onChange={(event) =>
              setManual({ ...manual, jiraLink: event.target.value })
            }
            placeholder="Jira link"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={manual.startDate}
              onChange={(event) =>
                setManual({
                  ...manual,
                  startDate: event.target.value,
                  expectedStartDate: event.target.value,
                })
              }
            />
            <Input
              type="date"
              value={manual.endDate}
              onChange={(event) =>
                setManual({
                  ...manual,
                  endDate: event.target.value,
                  expectedEndDate: event.target.value,
                })
              }
            />
          </div>
          <Textarea
            value={manual.description}
            onChange={(event) =>
              setManual({ ...manual, description: event.target.value })
            }
            placeholder="Description"
          />
          <Button
            onClick={() => {
              onSubmit(project.id, {
                ...manual,
                title: manual.title || "New task",
              });
              setNaturalInput(
                "Add API migration for Ravi next Monday to Apr 30 jira ENG-123",
              );
              setManual(emptyTask());
              onClose();
            }}
            className="w-full"
          >
            Add manually
          </Button>
        </section>
      </div>
    </Modal>
  );
};
