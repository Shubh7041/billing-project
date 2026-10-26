
import type { HTMLAttributes, ReactNode } from "react";
import "./ui.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  title,
  description,
  headerAction,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const hasHeader =
    title !== undefined ||
    description !== undefined ||
    headerAction !== undefined;

  return (
    <section
      {...props}
      className={[
        "ui-card",
        `ui-card-padding-${padding}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeader && (
        <div className="ui-card-header">
          <div className="ui-card-heading">
            {title !== undefined && (
              <div className="ui-card-title">{title}</div>
            )}
            {description !== undefined && (
              <div className="ui-card-description">{description}</div>
            )}
          </div>

          {headerAction !== undefined && (
            <div className="ui-card-header-action">{headerAction}</div>
          )}
        </div>
      )}

      <div className="ui-card-content">{children}</div>
    </section>
  );
}
