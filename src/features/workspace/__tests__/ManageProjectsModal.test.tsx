import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageProjectsModal } from "../ManageProjectsModal";

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

const projects = [makeProject()];

describe("ManageProjectsModal", () => {
  it("renders the project list", () => {
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={["proj-1"]}
        onClose={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );
    expect(screen.getByText("Project 1")).toBeInTheDocument();
  });

  it("creates a project when the form is submitted", async () => {
    const onCreateProject = vi.fn();
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={onCreateProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Project name"),
      "New Project",
    );
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onCreateProject).toHaveBeenCalledWith("New Project", "");
  });

  it("does not create a project with an empty name", async () => {
    const onCreateProject = vi.fn();
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={onCreateProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onCreateProject).not.toHaveBeenCalled();
  });

  it("shows the empty state when there are no projects", () => {
    render(
      <ManageProjectsModal
        open={true}
        projects={[]}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No projects yet. Create one below."),
    ).toBeInTheDocument();
  });

  it("enters edit mode and saves changes", async () => {
    const onUpdateProject = vi.fn();
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={onUpdateProject}
        onDeleteProject={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText("Rename Project 1"));
    const nameInputs = screen.getAllByPlaceholderText("Project name");
    // The first "Project name" input belongs to the edit form (rendered in the
    // project list, before the create form at the bottom)
    fireEvent.change(nameInputs[0], {
      target: { value: "Renamed" },
    });
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(onUpdateProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Renamed" }),
    );
  });

  it("confirms and deletes a project", async () => {
    const onDeleteProject = vi.fn(async () => {});
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={onDeleteProject}
      />,
    );
    await userEvent.click(screen.getByLabelText("Delete Project 1"));
    await userEvent.click(screen.getByRole("button", { name: /Yes, delete/i }));
    expect(onDeleteProject).toHaveBeenCalledWith("proj-1");
  });

  it("shows the 'Add Run the prod' button when no such project exists", () => {
    render(
      <ManageProjectsModal
        open={true}
        projects={projects}
        visibleProjectIds={[]}
        onClose={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Add "Run the prod"/i }),
    ).toBeInTheDocument();
  });
});
