import type { ButtonProps } from "./Button.js";
import { ButtonBase } from "./ButtonBase.js";

export type IconButtonProps = Omit<ButtonProps, "startIcon" | "endIcon" | "aria-label"> & {
  "aria-label": string;
};

export function IconButton({ variant = "ghost", ...props }: IconButtonProps) {
  return <ButtonBase {...props} iconOnly variant={variant} />;
}
