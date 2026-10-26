
import type { ReactNode } from "react";
import { Text } from "./Text";
import "./data-display.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon !== undefined && (
        <div className="empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}

      <Text variant="h3">{title}</Text>

      {description && (
        <Text variant="small" tone="muted">
          {description}
        </Text>
      )}

      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
