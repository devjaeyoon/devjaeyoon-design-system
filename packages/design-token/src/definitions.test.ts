import { describe, expect, it } from "vitest";
import {
  lightThemeDefinition,
  motionModeDefinitions,
  primitiveDefinition,
  semanticDefinition,
  themeDefinitions,
} from "./definitions";

describe("DTCG definitions API", () => {
  it("retains original references in typed definitions", () => {
    expect(lightThemeDefinition.color.bg.brand.solid.$root.$value).toBe("{color.palette.blue.700}");
    expect(semanticDefinition.space.layout.gutter.$value).toBe("{space.4}");
    expect(motionModeDefinitions.preferred.motion.duration.feedback.$value).toBe(
      "{motion.duration.fast}",
    );
  });

  it("provides primitive, theme, and motion-mode trees", () => {
    expect(primitiveDefinition.$schema).toContain("2025.10");
    expect(themeDefinitions.dark).not.toBe(themeDefinitions.light);
    expect(motionModeDefinitions.reduced.motion.duration.feedback.$value).toEqual({
      unit: "ms",
      value: 0.01,
    });
  });
});
