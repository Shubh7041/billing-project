import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function Icon({
  icon: IconComponent,
  size = 18,
  strokeWidth = 1.8,
  className = "",
  label,
}: IconProps) {
  return (
    <IconComponent
      className={["ui-icon", className].filter(Boolean).join(" ")}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}