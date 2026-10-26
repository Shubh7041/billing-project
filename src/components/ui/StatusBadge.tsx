
import type { HTMLAttributes, ReactNode } from "react";
import "./data-display.css";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: StatusBadgeVariant;
}

export function StatusBadge({
  children,
  variant = "neutral",
  className = "",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={[
        "status-badge",
        `status-badge-${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="status-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
