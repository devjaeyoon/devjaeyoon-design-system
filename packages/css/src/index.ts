export const themeAttribute = "data-theme";

export type ThemeName = "light" | "dark";
export type ThemePreference = ThemeName | "system";

export function applyThemePreference(
  root: Pick<Element, "removeAttribute" | "setAttribute">,
  preference: ThemePreference,
): void {
  if (preference === "system") {
    root.removeAttribute(themeAttribute);
    return;
  }

  root.setAttribute(themeAttribute, preference);
}
