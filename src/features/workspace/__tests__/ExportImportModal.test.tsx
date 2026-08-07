import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportImportModal } from "../ExportImportModal";

describe("ExportImportModal", () => {
  it("renders export and import sections", () => {
    render(
      <ExportImportModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const onExport = vi.fn();
    render(
      <ExportImportModal
        open={true}
        onClose={vi.fn()}
        onExport={onExport}
        onImport={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Export workspace/i }),
    );
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("calls onImport and onClose when a file is selected", async () => {
    const onImport = vi.fn(async () => {});
    const onClose = vi.fn();
    render(
      <ExportImportModal
        open={true}
        onClose={onClose}
        onExport={vi.fn()}
        onImport={onImport}
      />,
    );
    // The hidden file input is triggered by the button; simulate via the input
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["{}"], "workspace.json", {
      type: "application/json",
    });
    // Trigger the change handler directly
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onImport).toHaveBeenCalledWith(file);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
