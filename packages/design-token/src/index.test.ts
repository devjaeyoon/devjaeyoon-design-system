import { describe, expect, it } from "vitest";
import {
  darkThemeTokens,
  lightThemeTokens,
  primitiveTokens,
  semanticTokens,
  textStyles,
  themes,
} from "./index";

function valuesDeep(value: unknown): unknown[] {
  if (value === null || typeof value !== "object") return [value];
  return Object.values(value).flatMap(valuesDeep);
}

describe("resolved design-token API", () => {
  it("keeps light and dark themes structurally compatible", () => {
    expect(Object.keys(darkThemeTokens).sort()).toEqual(Object.keys(lightThemeTokens).sort());
    expect(themes.light["color-bg-canvas"]).not.toBe(themes.dark["color-bg-canvas"]);
  });

  it("returns CSS values without references or var() expressions", () => {
    const values = valuesDeep({
      darkThemeTokens,
      lightThemeTokens,
      primitiveTokens,
      semanticTokens,
      textStyles,
    });

    expect(values.every((value) => typeof value === "string")).toBe(true);
    expect(values).not.toContain(expect.stringMatching(/^\{.+\}$/u));
    expect(values).not.toContain(expect.stringContaining("var("));
  });

  it("provides the complete rem-based spacing scale and semantic spacing", () => {
    expect(Object.keys(primitiveTokens.space)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "8",
      "10",
      "12",
      "16",
      "20",
      "24",
    ]);
    expect(Object.values(primitiveTokens.space).every((value) => value.endsWith("rem"))).toBe(true);
    expect(semanticTokens["space-layout-gutter"]).toBe("1rem");
    expect(semanticTokens["space-content-stack-lg"]).toBe("1.5rem");
  });

  it("exposes the fixed typography grammar as resolved composites", () => {
    expect(Object.keys(textStyles)).toHaveLength(30);
    expect(textStyles["typography-display-lg-strong"]).toMatchObject({
      fontSize: "48px",
      fontWeight: "700",
      letterSpacing: "-0.025em",
      lineHeight: "1.1",
    });
    expect(textStyles["typography-body-md-regular"]).toMatchObject({
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "1.5",
    });
    expect(
      Object.keys(textStyles).some(
        (name) => name.startsWith("typography-display") && name.endsWith("regular"),
      ),
    ).toBe(false);
  });

  it("exports shared control dimensions in rem", () => {
    expect(semanticTokens).toMatchObject({
      "radius-control": "0.75rem",
      "size-control-sm": "2rem",
      "size-control-md": "2.5rem",
      "size-control-lg": "3.25rem",
    });
  });

  it("exposes the preferred semantic motion values", () => {
    expect(semanticTokens).toMatchObject({
      "motion-duration-enter": "200ms",
      "motion-duration-feedback": "120ms",
      "motion-easing-enter": "cubic-bezier(0,0,0.2,1)",
      "motion-easing-feedback": "cubic-bezier(0.2,0,0,1)",
    });
  });
});
