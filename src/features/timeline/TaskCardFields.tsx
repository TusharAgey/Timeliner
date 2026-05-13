import { Input, Textarea } from "../../components/ui/Input";
import { AssigneeCombobox } from "./AssigneeCombobox";
import { reassignAccountable, reassignTask } from "../../lib/assignees";
import type { Person, Task } from "../../models/types";

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
  onChange: (draft: Task) => void;
};

export const EditFields = ({ draft, people, onChange }: EditFieldsProps) => (
  <div className="grid gap-3 rounded-2xl bg-black/16 p-3 ring-1 ring-white/8">
    <Field label="Task Title">
      <Input
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
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
