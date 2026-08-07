import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesModal } from "../TemplatesModal";
import type { Project, TaskTemplate } from "../../../models/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "proj-1",
  name: "Project 1",
  slug: "project-1",
  description: "",
  milestones: [],
  tasks: [],
  ...overrides,
});

const makeTemplate = (overrides: Partial<TaskTemplate> = {}): TaskTemplate => ({
  id: "tmpl-1",
  name: "Bug Fix",
  title: "Fix bug",
  description: "",
  assignees: [],
  accountable: [],
  deliverable: "",
  priority: "High",
  labels: [],
  durationDays: 3,
  ...overrides,
});

describe("TemplatesModal", () => {
  it("renders the empty state when there are no templates", () => {
    render(
      <TemplatesModal
        open={true}
        templates={[]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onInstantiate={vi.fn()}
      />,
    );
    expect(screen.getByText(/No templates yet/i)).toBeInTheDocument();
  });

  it("renders existing templates", () => {
    render(
      <TemplatesModal
        open={true}
        templates={[makeTemplate()]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onInstantiate={vi.fn()}
      />,
    );
    expect(screen.getByText("Bug Fix")).toBeInTheDocument();
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
  });

  it("opens the new template form", async () => {
    render(
      <TemplatesModal
        open={true}
        templates={[]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onInstantiate={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /New template/i }),
    );
    expect(
      screen.getByPlaceholderText("Template name (e.g. Sprint task)"),
    ).toBeInTheDocument();
  });

  it("saves a new template", async () => {
    const onSaveTemplate = vi.fn();
    render(
      <TemplatesModal
        open={true}
        templates={[]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={onSaveTemplate}
        onDeleteTemplate={vi.fn()}
        onInstantiate={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /New template/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Template name (e.g. Sprint task)"),
      "Sprint task",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Task title"),
      "Do the thing",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Save template/i }),
    );
    expect(onSaveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Sprint task", title: "Do the thing" }),
    );
  });

  it("deletes a template", async () => {
    const onDeleteTemplate = vi.fn();
    render(
      <TemplatesModal
        open={true}
        templates={[makeTemplate()]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={onDeleteTemplate}
        onInstantiate={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Delete template/i }),
    );
    expect(onDeleteTemplate).toHaveBeenCalledWith("tmpl-1");
  });

  it("instantiates a template into a project", async () => {
    const onInstantiate = vi.fn();
    render(
      <TemplatesModal
        open={true}
        templates={[makeTemplate()]}
        projects={[makeProject()]}
        onClose={vi.fn()}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onInstantiate={onInstantiate}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Instantiate into project/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Create task/i }));
    expect(onInstantiate).toHaveBeenCalledWith(
      "tmpl-1",
      "proj-1",
      expect.any(String),
    );
  });
});
