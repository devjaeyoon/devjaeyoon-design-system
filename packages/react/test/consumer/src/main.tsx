import { applyThemePreference } from "@devjaeyoon-design-system/css";
import {
  Button,
  type ButtonProps,
  type ButtonTone,
  IconButton,
  type IconButtonProps,
  TextField,
  type TextFieldProps,
} from "@devjaeyoon-design-system/react";
import { type CSSProperties, StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type Theme = "light" | "dark";

function ConsumerApp() {
  const [name, setName] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyThemePreference(document.documentElement, theme);
  }, [theme]);

  const fieldProps: TextFieldProps = {
    autoComplete: "name",
    description: "Enter the name saved with this profile.",
    id: "consumer-name",
    label: "Name",
    name: "name",
    onChange: (event) => setName(event.currentTarget.value),
    placeholder: "Ada Lovelace",
    ref: inputRef,
    required: true,
    value: name,
  };
  const submitProps: ButtonProps = {
    children: "Save profile",
    name: "intent",
    type: "submit",
    value: "save",
  };

  const [actions, setActions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  const tone: ButtonTone = "danger";
  const actionProps: IconButtonProps = {
    "aria-label": "Delete item",
    children: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    ),
    loading,
    disabled,
    loadingLabel: "Deleting item",
    variant: "outline",
    tone,
    size: "large",
    ref: actionRef,
    name: "intent",
    value: "delete",
    onClick: () => {
      setActions((value) => value + 1);
      actionRef.current?.setAttribute("data-ref", "received");
    },
  };

  return (
    <main
      style={{
        background: "var(--djy-color-bg-canvas)",
        color: "var(--djy-color-fg-neutral)",
        fontFamily: "var(--djy-font-family-sans)",
        minHeight: "100vh",
        padding: "var(--djy-space-6)",
      }}
    >
      <h1 style={{ overflowWrap: "anywhere" }}>Installed package consumer</h1>
      <Button
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        type="button"
        variant="secondary"
      >
        {theme === "light" ? "Use dark theme" : "Use light theme"}
      </Button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedName(name);
        }}
        style={{
          display: "grid",
          gap: "var(--djy-space-4)",
          marginBlock: "var(--djy-space-6)",
          maxWidth: "24rem",
        }}
      >
        <TextField {...fieldProps} />
        <Button {...submitProps} />
        <Button variant="outline" onClick={() => setActions((value) => value + 1)}>
          Preview profile
        </Button>
        <IconButton {...actionProps} />
      </form>
      <Button variant="secondary" onClick={() => setLoading((value) => !value)}>
        Toggle loading
      </Button>
      <Button variant="secondary" onClick={() => setDisabled((value) => !value)}>
        Toggle disabled
      </Button>
      <section
        aria-label="Button states"
        style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
      >
        {(["default", "danger"] as const).map((tone) =>
          (["primary", "secondary", "outline", "ghost"] as const).map((variant) => (
            <Button
              key={`${tone}-${variant}`}
              tone={tone}
              variant={variant}
              data-testid={`${tone}-${variant}`}
            >
              {tone} {variant}
            </Button>
          )),
        )}
      </section>
      <section
        aria-label="Neutral theme"
        style={
          {
            "--djy-color-bg-brand-solid": "var(--djy-color-bg-neutral-solid)",
            "--djy-color-bg-brand-solid-hover": "var(--djy-color-bg-neutral-solid-hover)",
            "--djy-color-bg-brand-solid-pressed": "var(--djy-color-bg-neutral-solid-pressed)",
            "--djy-color-fg-on-brand": "var(--djy-color-fg-on-neutral)",
          } as CSSProperties
        }
      >
        <Button data-testid="neutral-primary">Neutral save</Button>
        <IconButton aria-label="Neutral add" variant="primary" data-testid="neutral-icon">
          <span>+</span>
        </IconButton>
        <Button data-testid="neutral-danger" tone="danger">
          Neutral delete
        </Button>
      </section>
      <p data-testid="actions">Actions: {actions}</p>
      <Button data-testid="long-label" size="large" style={{ width: "100%", maxWidth: "20rem" }}>
        Review and save all changes to the selected items before continuing to the next step
      </Button>
      <p aria-live="polite" role="status">
        {submittedName ? `Saved ${submittedName}` : "No profile saved yet."}
      </p>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Expected the consumer app root element.");

createRoot(rootElement).render(
  <StrictMode>
    <ConsumerApp />
  </StrictMode>,
);
