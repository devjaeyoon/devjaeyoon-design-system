import { strict as assert } from "node:assert";
import { Button, TextField } from "@devjaeyoon-design-system/react";
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
    createElement(Button, { type: "submit" }, "Save profile"),
  ),
);

assert.match(markup, /<button/u);
assert.match(markup, /Save profile/u);
assert.match(markup, /<label[^>]*for="consumer-email"/u);
assert.match(markup, /<input[^>]*id="consumer-email"/u);
assert.match(markup, /aria-describedby="consumer-email-description consumer-email-error"/u);
assert.match(markup, /aria-invalid="true"/u);
