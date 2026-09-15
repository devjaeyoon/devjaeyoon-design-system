import { type ComponentPropsWithRef, useId } from "react";

export type TextFieldType = "text" | "email" | "password" | "search" | "tel" | "url";

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "children" | "type"> & {
  label: string;
  description?: string;
  error?: string;
  type?: TextFieldType;
};

export function TextField({
  label,
  description,
  error,
  id,
  className,
  required,
  type = "text",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error?.trim());
  const descriptionIds = [
    ...new Set(
      [
        ...(describedBy?.split(/\s+/u) ?? []),
        description ? descriptionId : "",
        hasError ? errorId : "",
      ].filter(Boolean),
    ),
  ].join(" ");

  return (
    <div className="djy-text-field">
      <label className="djy-text-field__label" htmlFor={inputId}>
        {label}
        {required ? " (필수)" : ""}
      </label>
      <input
        {...inputProps}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={hasError ? true : invalid}
        className={["djy-text-field__input", className].filter(Boolean).join(" ")}
        id={inputId}
        required={required}
        type={type}
      />
      {description ? (
        <p className="djy-text-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {hasError ? (
        <p className="djy-text-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
