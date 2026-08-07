import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input, Textarea } from "../Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("passes through value and onChange", async () => {
    const onChange = vi.fn();
    render(<Input value="hello" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("hello");
    await userEvent.type(input, "x");
    expect(onChange).toHaveBeenCalled();
  });

  it("merges a custom className", () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole("textbox").className).toContain("custom-class");
  });

  it("supports type date", () => {
    const { container } = render(<Input type="date" />);
    const input = container.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute("type", "date");
  });
});

describe("Textarea", () => {
  it("renders a textarea element", () => {
    render(<Textarea placeholder="Describe" />);
    expect(screen.getByPlaceholderText("Describe")).toBeInTheDocument();
  });

  it("passes through value", () => {
    render(<Textarea value="content" readOnly />);
    expect(screen.getByRole("textbox")).toHaveValue("content");
  });

  it("merges a custom className", () => {
    render(<Textarea className="custom-class" />);
    expect(screen.getByRole("textbox").className).toContain("custom-class");
  });
});
