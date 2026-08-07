import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceLauncher } from "../WorkspaceLauncher";

describe("WorkspaceLauncher", () => {
  it("renders the heading and description", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        fsSupported={true}
        error={null}
      />,
    );
    expect(
      screen.getByText(/Plan multi-project delivery/i),
    ).toBeInTheDocument();
  });

  it("calls onCreate when Create Workspace is clicked", async () => {
    const onCreate = vi.fn();
    render(
      <WorkspaceLauncher
        onCreate={onCreate}
        onOpen={vi.fn()}
        fsSupported={true}
        error={null}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Create Workspace/i }),
    );
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("calls onOpen when Open Existing Workspace is clicked", async () => {
    const onOpen = vi.fn();
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={onOpen}
        fsSupported={true}
        error={null}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Open Existing Workspace/i }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when fs is not supported", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        fsSupported={false}
        error={null}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Create Workspace/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Open Existing Workspace/i }),
    ).toBeDisabled();
  });

  it("shows a warning when fs is not supported", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        fsSupported={false}
        error={null}
      />,
    );
    expect(
      screen.getByText(/File System Access API is unavailable/i),
    ).toBeInTheDocument();
  });

  it("does not show the fs warning when supported", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        fsSupported={true}
        error={null}
      />,
    );
    expect(
      screen.queryByText(/File System Access API is unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("renders the error message when present", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        fsSupported={true}
        error="Something failed"
      />,
    );
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("disables buttons when disabled is true", () => {
    render(
      <WorkspaceLauncher
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        disabled={true}
        fsSupported={true}
        error={null}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Create Workspace/i }),
    ).toBeDisabled();
  });
});
