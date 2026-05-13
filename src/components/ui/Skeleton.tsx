type SkeletonProps = {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
};

const variantClasses: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "rounded-md",
  circular: "rounded-full",
  rectangular: "rounded-xl",
};

export const Skeleton = ({
  className = "",
  variant = "text",
  width,
  height,
}: SkeletonProps) => (
  <div
    className={`animate-pulse bg-white/8 ${variantClasses[variant]} ${className}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);
