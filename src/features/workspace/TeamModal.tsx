import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Person } from "../../models/types";
import { uid } from "../../lib/utils";

type TeamModalProps = {
  open: boolean;
  people: Person[];
  onClose: () => void;
  onSave: (person: Person) => void;
  onDelete: (personId: string) => void;
};

const emptyDraft = (): Person => ({ id: uid("person"), name: "", role: "" });

export const TeamModal = ({
  open,
  people,
  onClose,
  onSave,
  onDelete,
}: TeamModalProps) => {
  const [draft, setDraft] = useState<Person>(emptyDraft());
  const editingExisting = people.some((person) => person.id === draft.id);

  const resetDraft = () => setDraft(emptyDraft());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Team"
      description="Add and edit people available in assignee dropdowns."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            {editingExisting ? "Edit person" : "Add person"}
          </h3>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-gray-400">Name</span>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder="Ava Singh"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-gray-400">Role</span>
              <Input
                value={draft.role}
                onChange={(event) =>
                  setDraft({ ...draft, role: event.target.value })
                }
                placeholder="Program Manager"
              />
            </label>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const name = draft.name.trim();
                  if (!name) return;
                  onSave({
                    ...draft,
                    name,
                    role: draft.role.trim() || "Team member",
                  });
                  resetDraft();
                }}
              >
                <Plus className="size-4" />
                {editingExisting ? "Save changes" : "Add person"}
              </Button>
              {editingExisting ? (
                <Button variant="secondary" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            People
          </h3>
          <div className="mt-4 space-y-2">
            {people.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-black/18 px-3 py-2 ring-1 ring-white/6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {person.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {person.role}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    className="rounded-full p-2"
                    onClick={() => setDraft(person)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full p-2 text-rose-300"
                    onClick={() => {
                      onDelete(person.id);
                      if (draft.id === person.id) resetDraft();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
};
