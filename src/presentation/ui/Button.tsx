import type { ComponentProps } from "react";
export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}
const variants = {
  primary: "button primary",
  secondary: "button",
  danger: "button danger",
  ghost: "",
};
/** Shared native-button semantics; ghost supports toolbar and thumbnail layouts. */
export function Button({
  variant = "ghost",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={
        [variants[variant], className].filter(Boolean).join(" ") || undefined
      }
      {...props}
    />
  );
}
