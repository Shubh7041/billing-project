
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageContainer({
  children,
  title,
  description,
  actions,
}: PageContainerProps) {
  return (
    <main className="page-container">
      {(title || description || actions) && (
        <div className="page-heading">
          <div className="page-heading-copy">
            {title && <h1 className="page-title">{title}</h1>}
            {description && (
              <p className="page-description">{description}</p>
            )}
          </div>

          {actions && <div className="page-heading-actions">{actions}</div>}
        </div>
      )}

      {children}
    </main>
  );
}
