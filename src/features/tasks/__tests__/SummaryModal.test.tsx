import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryModal } from "../SummaryModal";
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

describe("SummaryModal", () => {
  it("renders the summary sections when open", () => {
    render(
      <SummaryModal open={true} projects={[makeProject()]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Highlights")).toBeInTheDocument();
    expect(screen.getByText("Lowlights")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("Project health heatmap")).toBeInTheDocument();
  });

  it("renders the project name in the health heatmap", () => {
    render(
      <SummaryModal open={true} projects={[makeProject()]} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Project 1")).toBeInTheDocument();
  });

  it("shows a fallback modal when closed", () => {
    render(
      <SummaryModal
        open={false}
        projects={[makeProject()]}
        onClose={vi.fn()}
      />,
    );
    // When closed, the modal renders nothing
    expect(screen.queryByText("Highlights")).not.toBeInTheDocument();
  });
});
