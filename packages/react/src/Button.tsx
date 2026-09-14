import type { ComponentPropsWithRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "small" | "medium" | "large";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = "medium",
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps) {
  const classes = ["djy-button", `djy-button--${variant}`, `djy-button--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      className={classes}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="djy-button__spinner" /> : null}
      <span>{children}</span>
      <span aria-live="polite" className="djy-sr-only">
        {loading ? "Loading" : ""}
      </span>
    </button>
  );
}
