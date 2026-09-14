import { describe, expect, it } from "vitest";
import { pagesBasePath, storybookBasePath, storybookUrl } from "./site-config";

describe("GitHub Pages paths", () => {
  it("keeps Starlight and Storybook under the repository path", () => {
    expect(pagesBasePath).toBe("/devjaeyoon-design-system");
    expect(storybookBasePath).toBe("/devjaeyoon-design-system/storybook/");
    expect(storybookUrl).toBe("https://devjaeyoon.github.io/devjaeyoon-design-system/storybook/");
  });
});
