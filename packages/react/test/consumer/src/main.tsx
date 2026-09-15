import { applyThemePreference } from "@devjaeyoon-design-system/css";
import {
  Button,
  type ButtonProps,
  TextField,
  type TextFieldProps,
} from "@devjaeyoon-design-system/react";
import { StrictMode, useEffect, useRef, useState } from "react";
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
      <h1>Installed package consumer</h1>
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
      </form>
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
