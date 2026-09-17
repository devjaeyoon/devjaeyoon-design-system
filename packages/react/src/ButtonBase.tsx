import { useId } from "react";
import type { ButtonProps } from "./Button.js";

type ButtonBaseProps = ButtonProps & { iconOnly?: boolean };

export function ButtonBase({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "처리 중",
  size = "medium",
  type = "button",
  variant = "primary",
  tone = "default",
  startIcon,
  endIcon,
  iconOnly = false,
  "aria-describedby": describedBy,
  "aria-busy": busy,
  ...buttonProps
}: ButtonBaseProps) {
  const statusId = useId();
  const classes = [
    "djy-button",
    `djy-button--${variant}`,
    `djy-button--${size}`,
    `djy-button--${tone}`,
    iconOnly && "djy-icon-button",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const spinner = <span aria-hidden="true" className="djy-button__spinner" />;

  return (
    <>
      <button
        {...buttonProps}
        aria-busy={loading || busy}
        aria-describedby={[describedBy, loading && statusId].filter(Boolean).join(" ") || undefined}
        className={classes}
        data-loading={loading || undefined}
        disabled={disabled || loading}
        type={type}
      >
        {iconOnly ? (
          loading ? (
            spinner
          ) : (
            <span aria-hidden="true" className="djy-button__icon">
              {children}
            </span>
          )
        ) : (
          <>
            {loading ? (
              spinner
            ) : startIcon != null ? (
              <span aria-hidden="true" className="djy-button__icon">
                {startIcon}
              </span>
            ) : null}
            <span className="djy-button__label">{children}</span>
            {endIcon != null ? (
              <span aria-hidden="true" className="djy-button__icon">
                {endIcon}
              </span>
            ) : null}
          </>
        )}
      </button>
      <span aria-live="polite" className="djy-sr-only" id={statusId}>
        {loading ? loadingLabel : ""}
      </span>
    </>
  );
}
