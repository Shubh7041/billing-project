
import type { CSSProperties, ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import "./data-display.css";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  rowLabel?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  loadingMessage = "Loading data...",
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display yet.",
  emptyAction,
  rowLabel,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`data-table-cell-align-${column.align ?? "left"}`}
                style={
                  column.width
                    ? ({ width: column.width } satisfies CSSProperties)
                    : undefined
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} aria-label={rowLabel?.(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`data-table-cell-align-${column.align ?? "left"}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
