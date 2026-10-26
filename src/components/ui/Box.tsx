
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import "./ui.css";

type BoxDirection = "row" | "column";
type BoxAlign = "start" | "center" | "end" | "stretch";
type BoxJustify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around";

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  direction?: BoxDirection;
  align?: BoxAlign;
  justify?: BoxJustify;
  gap?: number;
  wrap?: boolean;
  fullWidth?: boolean;
}

export function Box({
  children,
  direction = "column",
  align = "stretch",
  justify = "start",
  gap,
  wrap = false,
  fullWidth = false,
  className = "",
  style,
  ...props
}: BoxProps) {
  const boxStyle: CSSProperties = {
    ...style,
    ...(gap !== undefined ? { "--ui-box-gap": `${gap * 4}px` } : {}),
  } as CSSProperties;

  return (
    <div
      {...props}
      style={boxStyle}
      className={[
        "ui-box",
        `ui-box-${direction}`,
        `ui-box-align-${align}`,
        `ui-box-justify-${justify}`,
        wrap ? "ui-box-wrap" : "",
        fullWidth ? "ui-box-full-width" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
