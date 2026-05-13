import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "../../components/ui/Input";
import type { Person } from "../../models/types";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

type AssigneeComboboxProps = {
  value: string;
  people: Person[];
  onChange: (value: string) => void;
};

export const AssigneeCombobox = ({
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
        aria-label="Search assignee"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      {open ? (
        <div
          className="absolute left-0 right-0 top-12 z-[80] overflow-hidden rounded-2xl border border-slate-700 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.72)] ring-1 ring-black"
          style={{ backgroundColor: "#020617" }}
          role="listbox"
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
                role="option"
                aria-selected={index === activeIndex}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${index === activeIndex ? "bg-slate-800" : "bg-slate-950 hover:bg-slate-900"}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-slate-200 ring-1 ring-white/8">
                  {person ? initials(person.name) : "+"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-100">
                    {person ? person.name : `Add "${searchValue.trim()}"`}
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
