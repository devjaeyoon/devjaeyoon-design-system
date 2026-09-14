import { describe, expect, it } from "vitest";
import { darkThemeTokens, lightThemeTokens, type ThemeTokens } from "./index";

function luminance(hex: string) {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Expected a hex color, received ${hex}.`);
  }
  const channels = [match[1], match[2], match[3]].map(
    (channel) => Number.parseInt(channel, 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const [red = 0, green = 0, blue = 0] = linear;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const intents = ["brand", "critical", "warning", "positive", "informative"] as const;

function expectAccessiblePairs(tokens: ThemeTokens) {
  for (const intent of intents) {
    expect(
      contrast(tokens[`color-bg-${intent}-solid`], tokens[`color-fg-on-${intent}`]),
      `${intent} solid/on-${intent}`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens[`color-bg-${intent}-weak`], tokens[`color-fg-${intent}`]),
      `${intent} weak/foreground`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens[`color-stroke-${intent}-solid`], tokens["color-bg-canvas"]),
      `${intent} solid stroke`,
    ).toBeGreaterThanOrEqual(3);
  }
  for (const background of ["color-bg-canvas", "color-bg-surface", "color-bg-elevated"] as const) {
    expect(
      contrast(tokens["color-fg-neutral"], tokens[background]),
      `neutral text on ${background}`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens["color-stroke-focus"], tokens[background]),
      `focus on ${background}`,
    ).toBeGreaterThanOrEqual(3);
  }
}

describe("semantic color contrast", () => {
  it("meets text and non-text contrast thresholds in both themes", () => {
    expectAccessiblePairs(lightThemeTokens);
    expectAccessiblePairs(darkThemeTokens);
  });
});
