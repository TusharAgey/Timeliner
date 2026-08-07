import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamModal } from "../TeamModal";

import type { Person } from "../../../models/types";

const people: Person[] = [
  { id: "p1", name: "Alice", role: "Developer" },
  { id: "p2", name: "Bob", role: "Manager" },
];

describe("TeamModal", () => {
  it("renders the people list", () => {
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("adds a person when the form is filled and submitted", async () => {
    const onSave = vi.fn();
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Ava Singh"), "Carol");
    await userEvent.type(
      screen.getByPlaceholderText("Program Manager"),
      "Designer",
    );
    await userEvent.click(screen.getByRole("button", { name: /Add person/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Carol", role: "Designer" }),
    );
  });

  it("does not save when the name is empty", async () => {
    const onSave = vi.fn();
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Add person/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("defaults the role to 'Team member' when empty", async () => {
    const onSave = vi.fn();
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Ava Singh"), {
      target: { value: "Carol" },
    });
    await userEvent.click(screen.getByRole("button", { name: /Add person/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Carol", role: "Team member" }),
    );
  });

  it("deletes a person", async () => {
    const onDelete = vi.fn();
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete Alice" }));
    expect(onDelete).toHaveBeenCalledWith("p1");
  });

  it("enters edit mode when the edit button is clicked", async () => {
    render(
      <TeamModal
        open={true}
        people={people}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
    expect(screen.getByText("Edit person")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
  });
});
