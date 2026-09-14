import { strict as assert } from "node:assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../dist/index.js";

const markup = renderToStaticMarkup(createElement(Button, null, "SSR button"));
assert.match(markup, /<button/u);
assert.match(markup, /SSR button/u);
