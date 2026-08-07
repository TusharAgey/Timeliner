import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("renders a div with the text variant by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("animate-pulse");
  });

  it("applies the circular variant", () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "rounded-full",
    );
  });

  it("applies the rectangular variant", () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "rounded-xl",
    );
  });

  it("applies width and height styles", () => {
    const { container } = render(<Skeleton width={100} height={20} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("20px");
  });

  it("supports string width and height", () => {
    const { container } = render(<Skeleton width="60%" height="10px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("60%");
    expect(el.style.height).toBe("10px");
  });

  it("merges a custom className", () => {
    const { container } = render(<Skeleton className="custom-class" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild as HTMLElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
