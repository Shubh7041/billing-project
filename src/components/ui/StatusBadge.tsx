
import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import "./data-display.css";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const statusIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: CircleAlert,
  info: Info,
  neutral: null,
} as const;

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
  const StatusIcon = statusIcons[variant];

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
      {StatusIcon ? (
        <StatusIcon className="status-badge-icon" size={14} strokeWidth={1.9} aria-hidden="true" />
      ) : (
        <span className="status-badge-dot" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
