import { strict as assert } from "node:assert";
import { readFile, writeFile } from "node:fs/promises";
import {
  Button,
  DialogBody,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  IconButton,
  TextField,
} from "@devjaeyoon-design-system/react";
import { createElement, StrictMode } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

const markup = renderToStaticMarkup(
  createElement(
    "form",
    null,
    createElement(TextField, {
      description: "Your contact email",
      error: "Email is required",
      id: "consumer-email",
      label: "Email",
      name: "email",
      required: true,
      type: "email",
    }),
    createElement(Button, { type: "submit", variant: "outline", tone: "danger" }, "Save profile"),
    createElement(
      IconButton,
      { "aria-label": "Delete item", loading: true, loadingLabel: "Deleting item", tone: "danger" },
      "×",
    ),
    createElement(
      DialogRoot,
      { defaultOpen: true },
      createElement(
        DialogContent,
        { description: "SSR description", title: "SSR dialog" },
        createElement(DialogBody, null, "SSR body"),
      ),
    ),
  ),
);

assert.match(markup, /<button/u);
assert.match(markup, /Save profile/u);
assert.match(markup, /<label[^>]*for="consumer-email"/u);
assert.match(markup, /<input[^>]*id="consumer-email"/u);
assert.match(markup, /aria-describedby="consumer-email-description consumer-email-error"/u);
assert.match(markup, /aria-invalid="true"/u);

assert.match(markup, /djy-button--outline/u);
assert.match(markup, /djy-button--danger/u);
assert.match(markup, /djy-icon-button/u);
assert.match(markup, /aria-label="Delete item"/u);
assert.match(markup, /Deleting item/u);
assert.match(markup, /aria-busy="true"/u);
assert.match(markup, /<dialog/u);
assert.match(markup, /SSR dialog/u);
assert.match(markup, /SSR description/u);
assert.match(markup, /djy-dialog__body/u);

// Match the client's fixture to verify hydration keeps the server's nodes and draft.
function HydrationFixture() {
  return createElement(
    DialogRoot,
    { defaultOpen: true },
    createElement(DialogTrigger, null, "Hydrated parent trigger"),
    createElement(
      DialogContent,
      { title: "Hydrated parent" },
      createElement(
        DialogBody,
        null,
        createElement("input", {
          id: "hydration-input",
          "aria-label": "Hydrated draft",
          defaultValue: "SSR draft",
        }),
        createElement(
          DialogRoot,
          { defaultOpen: true },
          createElement(DialogTrigger, null, "Hydrated child trigger"),
          createElement(
            DialogContent,
            { title: "Hydrated child" },
            createElement(
              DialogBody,
              null,
              createElement(TextField, { autoFocus: true, label: "Hydrated autofocus" }),
            ),
          ),
        ),
      ),
    ),
  );
}

const hydrationMarkup = renderToString(
  createElement(StrictMode, null, createElement(HydrationFixture)),
);
const html = await readFile("dist/index.html", "utf8");
assert.ok(html.includes('<div id="root"></div>'));
await writeFile(
  "dist/hydration.html",
  html.replace(
    '<div id="root"></div>',
    `<div id="root">${hydrationMarkup}</div><script>window.hydratedInput = document.getElementById("hydration-input"); window.hydratedInput.value = "Before hydration";</script>`,
  ),
);
