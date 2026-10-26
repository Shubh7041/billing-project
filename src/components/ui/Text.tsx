
import type { HTMLAttributes, ReactNode } from "react";
import "./ui.css";

export type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "small"
  | "label"
  | "caption";

export type TextTone =
  | "default"
  | "muted"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  tone?: TextTone;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "label" | "div";
  children: ReactNode;
}

const defaultElements: Record<TextVariant, TextProps["as"]> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  small: "p",
  label: "label",
  caption: "span",
};

export function Text({
  variant = "body",
  tone = "default",
  as,
  children,
  className = "",
  ...props
}: TextProps) {
  const Component = as ?? defaultElements[variant];

  return (
    <Component
      {...props}
      className={[
        "ui-text",
        `ui-text-${variant}`,
        `ui-text-${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}
