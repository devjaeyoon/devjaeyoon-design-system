import { describe, expect, it, vi } from "vitest";
import { applyThemePreference, themeAttribute } from "./index";

describe("CSS public API", () => {
  it("exposes the stable theme attribute", () => {
    expect(themeAttribute).toBe("data-theme");
  });

  it.each(["light", "dark"] as const)("applies the %s theme", (preference) => {
    const root = {
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
    };

    applyThemePreference(root, preference);

    expect(root.setAttribute).toHaveBeenCalledWith(themeAttribute, preference);
    expect(root.removeAttribute).not.toHaveBeenCalled();
  });

  it("represents the system preference by removing the theme attribute", () => {
    const root = {
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
    };

    applyThemePreference(root, "system");

    expect(root.removeAttribute).toHaveBeenCalledWith(themeAttribute);
    expect(root.setAttribute).not.toHaveBeenCalled();
  });
});
