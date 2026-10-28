
import { LoaderCircle } from "lucide-react";
import "./data-display.css";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Loading data...",
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={`loading-state loading-state-${size}`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="loading-state-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
