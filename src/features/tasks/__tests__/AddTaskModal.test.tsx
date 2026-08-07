import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTaskModal } from "../AddTaskModal";

import type { Project } from "../../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Project 1",
  slug: "project-1",
  description: "",
  milestones: [],
  tasks: [],
  ...overrides,
});

describe("AddTaskModal", () => {
  it("renders the natural language and manual sections", () => {
    render(
      <AddTaskModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSubmitNatural={vi.fn()}
      />,
    );
    expect(screen.getByText("Natural language")).toBeInTheDocument();
    expect(screen.getByText("Manual fallback")).toBeInTheDocument();
  });

  it("shows the parser preview", () => {
    render(
      <AddTaskModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSubmitNatural={vi.fn()}
      />,
    );
    expect(screen.getByText(/Parser preview/)).toBeInTheDocument();
  });

  it("submits natural language input", async () => {
    const onSubmitNatural = vi.fn();
    render(
      <AddTaskModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSubmitNatural={onSubmitNatural}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Add from sentence/i }),
    );
    expect(onSubmitNatural).toHaveBeenCalledWith(
      "proj-1",
      expect.stringContaining("API migration"),
    );
  });

  it("submits a manual task", async () => {
    const onSubmit = vi.fn();
    render(
      <AddTaskModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onSubmitNatural={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "Manual task" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: /Add manually/i }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({ title: "Manual task" }),
    );
  });

  it("defaults the manual title to 'New task' when empty", async () => {
    const onSubmit = vi.fn();
    render(
      <AddTaskModal
        open={true}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onSubmitNatural={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Add manually/i }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({ title: "New task" }),
    );
  });

  it("renders a project selector when there are multiple projects", () => {
    render(
      <AddTaskModal
        open={true}
        projects={[
          makeProject(),
          makeProject({ id: "proj-2", name: "Project 2" }),
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSubmitNatural={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Select project")).toBeInTheDocument();
  });

  it("returns null when there are no projects", () => {
    const { container } = render(
      <AddTaskModal
        open={true}
        projects={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSubmitNatural={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
