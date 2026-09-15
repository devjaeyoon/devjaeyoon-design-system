import { strict as assert } from "node:assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, TextField } from "../dist/index.js";

const markup = renderToStaticMarkup(createElement(Button, null, "SSR button"));
assert.match(markup, /<button/u);
assert.match(markup, /SSR button/u);

const fieldMarkup = renderToStaticMarkup(
  createElement(TextField, {
    label: "Email",
    type: "email",
    description: "Your contact email",
    error: "Required",
  }),
);
const inputId = fieldMarkup.match(/<input[^>]* id="([^"]+)"/u)?.[1];
assert.ok(inputId);
assert.ok(fieldMarkup.includes(`for="${inputId}"`));
assert.ok(fieldMarkup.includes(`aria-describedby="${inputId}-description ${inputId}-error"`));
assert.match(fieldMarkup, /aria-invalid="true"/u);
