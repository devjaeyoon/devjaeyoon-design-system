import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { primitiveTokens } from "@devjaeyoon-design-system/design-token";
import {
  darkThemeDefinition,
  lightThemeDefinition,
  preferredMotionDefinition,
  reducedMotionDefinition,
  semanticDefinition,
} from "@devjaeyoon-design-system/design-token/definitions";
import { describe, expect, it } from "vitest";
import { generateCss } from "./css-content.mjs";

const componentStyles = await readFile(
  fileURLToPath(new URL("../src/styles.css", import.meta.url)),
  "utf8",
);
const css = generateCss({
  componentStyles,
  darkThemeDefinition,
  lightThemeDefinition,
  preferredMotionDefinition,
  primitiveTokens,
  reducedMotionDefinition,
  semanticDefinition,
});

describe("generated CSS contract", () => {
  it("emits primitive values and semantic primitive references", () => {
    expect(css).toContain("--djy-color-palette-blue-700: #1d4ed8;");
    expect(css).toContain("--djy-color-bg-brand-solid: var(--djy-color-palette-blue-700);");
    expect(css).toContain("--djy-radius-control: var(--djy-radius-12);");
    expect(css).toContain("--djy-size-control-lg: var(--djy-size-52);");
    expect(css).toContain("--djy-space-layout-gutter: var(--djy-space-4);");
    expect(css).toContain("--djy-motion-easing-feedback: var(--djy-motion-curve-standard);");

    const preferredCss = css.slice(0, css.indexOf("@media (prefers-reduced-motion: reduce)"));
    const semanticDeclarations = [
      ...preferredCss.matchAll(
        /--djy-((?:color-(?:fg|bg|stroke)|space-(?:layout|content)|typography)-[^:]+|motion-(?:duration|easing)-(?:feedback|enter|exit)):\s*([^;]+);/gu,
      ),
    ];
    expect(semanticDeclarations.length).toBeGreaterThan(100);
    for (const declaration of semanticDeclarations) {
      expect(declaration[2], declaration[1]).toMatch(/^var\(--djy-/u);
    }
  });

  it("expands every typography composite into five property variables", () => {
    const styleNames = [
      "typography-display-lg-strong",
      "typography-heading-sm-strong",
      "typography-body-md-regular",
      "typography-caption-sm-strong",
    ];
    for (const name of styleNames) {
      for (const property of [
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "letter-spacing",
      ]) {
        expect(css).toContain(`--djy-${name}-${property}: var(--djy-font-`);
      }
    }
  });

  it("preserves the public layer and theme selector contract", () => {
    expect(css).toContain("@layer djy.tokens, djy.base, djy.components;");
    expect(css).toContain(':root[data-theme="light"]');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(":root:not([data-theme])");
    expect(css).not.toContain('[data-theme="system"]');
  });

  it("emits reduced-motion overrides for every semantic motion token", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    for (const name of ["feedback", "enter", "exit"]) {
      expect(css).toContain(`--djy-motion-duration-${name}: 0.01ms;`);
      expect(css).toContain(`--djy-motion-easing-${name}: linear;`);
    }
  });

  it("uses explicit Button state tokens without calculated or opacity-based states", () => {
    expect(css).toContain("--djy-color-bg-brand-solid-hover");
    expect(css).toContain("--djy-color-bg-brand-solid-pressed");
    expect(css).toContain("--djy-color-bg-neutral-weak-hover");
    expect(css).toContain("--djy-color-bg-transparent-pressed");
    expect(componentStyles).not.toContain("color-mix(");
    expect(componentStyles).not.toMatch(/opacity\s*:/u);
  });

  it("includes the authored component styles", () => {
    expect(css).toContain(".djy-sr-only");
    expect(css).toContain(".djy-button");
  });
});
