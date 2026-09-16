import type { ComponentPropsWithRef, ReactNode } from "react";
import { ButtonBase } from "./ButtonBase.js";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonTone = "default" | "danger";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

export function Button(props: ButtonProps) {
  return <ButtonBase {...props} />;
}
