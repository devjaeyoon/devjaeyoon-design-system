import { strict as assert } from "node:assert";
import { Button, IconButton, TextField } from "@devjaeyoon-design-system/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
