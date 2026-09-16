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
  it("keeps TextField placeholder, description and error text readable in both themes", () => {
    for (const tokens of [lightThemeTokens, darkThemeTokens]) {
      expect(
        contrast(tokens["color-fg-placeholder"], tokens["color-bg-surface"]),
      ).toBeGreaterThanOrEqual(4.5);
      for (const background of [
        "color-bg-canvas",
        "color-bg-surface",
        "color-bg-elevated",
      ] as const) {
        for (const foreground of ["color-fg-neutral-muted", "color-fg-critical"] as const) {
          expect(
            contrast(tokens[foreground], tokens[background]),
            `${foreground} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("meets text and non-text contrast thresholds in both themes", () => {
    expectAccessiblePairs(lightThemeTokens);
    expectAccessiblePairs(darkThemeTokens);
  });
});

// Transparent state colors are composited over the actual surrounding surface.
function composite(color: string, surface: string) {
  if (color === "transparent") return surface;
  if (color.startsWith("#")) return color;
  const match = color.match(/^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/u);
  if (!match) throw new Error(`Unsupported color: ${color}`);
  const alpha = Number(match[4]) / 100;
  return `#${[1, 2, 3]
    .map((index) => {
      const backdrop = Number.parseInt(surface.slice(1 + (index - 1) * 2, 3 + (index - 1) * 2), 16);
      return Math.round(Number(match[index]) * alpha + backdrop * (1 - alpha))
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

describe("Button and IconButton contrast", () => {
  for (const [theme, tokens] of Object.entries({
    light: lightThemeTokens,
    dark: darkThemeTokens,
  })) {
    it(`keeps enabled text, icons, outline and focus readable in ${theme}`, () => {
      for (const surface of [
        tokens["color-bg-canvas"],
        tokens["color-bg-surface"],
        tokens["color-bg-elevated"],
      ]) {
        expect(contrast(tokens["color-stroke-focus"], surface)).toBeGreaterThanOrEqual(3);
        for (const tone of ["default", "danger", "neutral-theme"] as const) {
          for (const variant of ["primary", "secondary", "outline", "ghost"] as const) {
            const family =
              tone === "danger" ? "critical" : tone === "neutral-theme" ? "neutral" : "brand";
            const fg =
              variant === "primary"
                ? tokens[`color-fg-on-${family}`]
                : tokens[tone === "danger" ? "color-fg-critical" : "color-fg-neutral"];
            for (const state of ["", "-hover", "-pressed"] as const) {
              const background =
                variant === "primary"
                  ? tokens[`color-bg-${family}-solid${state}`]
                  : variant === "secondary" || (tone === "danger" && state !== "")
                    ? tokens[`color-bg-${tone === "danger" ? "critical" : "neutral"}-weak${state}`]
                    : tokens[`color-bg-transparent${state}`];
              const renderedBackground = composite(background, surface);
              const label = `${theme}/${tone}/${variant}/${state || "rest"}`;
              // 4.5:1 also exceeds the 3:1 icon requirement.
              expect(contrast(fg, renderedBackground), label).toBeGreaterThanOrEqual(4.5);
              if (variant === "outline") {
                const border =
                  tokens[
                    tone === "danger" ? "color-stroke-critical-solid" : "color-stroke-neutral-solid"
                  ];
                expect(contrast(border, surface), `${label} outer border`).toBeGreaterThanOrEqual(
                  3,
                );
                expect(
                  contrast(border, renderedBackground),
                  `${label} inner border`,
                ).toBeGreaterThanOrEqual(3);
              }
            }
          }
        }
      }
    });
  }
});
