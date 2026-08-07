import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssigneeCombobox } from "../AssigneeCombobox";
import type { Person } from "../../../models/types";

const people: Person[] = [
  { id: "p1", name: "Alice Smith", role: "Developer" },
  { id: "p2", name: "Bob Jones", role: "Manager" },
];

describe("AssigneeCombobox", () => {
  it("renders the current value", () => {
    render(
      <AssigneeCombobox
        value="Alice Smith"
        people={people}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("Alice Smith");
  });

  it("opens the dropdown on focus", async () => {
    render(<AssigneeCombobox value="" people={people} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("filters people by name", async () => {
    render(<AssigneeCombobox value="" people={people} onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Bob" } });
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("filters people by role", async () => {
    render(<AssigneeCombobox value="" people={people} onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Manager" } });
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("calls onChange with the selected person name", async () => {
    const onChange = vi.fn();
    render(<AssigneeCombobox value="" people={people} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Alice Smith"));
    expect(onChange).toHaveBeenCalledWith("Alice Smith");
  });

  it("shows a create option for a new name", async () => {
    const onChange = vi.fn();
    render(<AssigneeCombobox value="" people={people} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Carol" } });
    expect(screen.getByText(/Add "Carol"/)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Add "Carol"/));
    expect(onChange).toHaveBeenCalledWith("Carol");
  });

  it("shows 'No people found' when there are no people", async () => {
    render(<AssigneeCombobox value="" people={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("No people found")).toBeInTheDocument();
  });

  it("selects an option with the Enter key", async () => {
    const onChange = vi.fn();
    render(<AssigneeCombobox value="" people={people} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("Alice Smith");
  });

  it("closes the dropdown on Escape", async () => {
    render(<AssigneeCombobox value="" people={people} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navigates options with arrow keys", async () => {
    const onChange = vi.fn();
    render(<AssigneeCombobox value="" people={people} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("Bob Jones");
  });
});
