import "@devjaeyoon-design-system/css/styles.css";
import {
  applyThemePreference,
  type ThemeName,
  type ThemePreference,
  themeAttribute,
} from "@devjaeyoon-design-system/css";

const explicitTheme: ThemeName = "dark";
const preferences: ThemePreference[] = ["system", "light", explicitTheme];

for (const preference of preferences) {
  applyThemePreference(document.documentElement, preference);
}

const output = document.createElement("output");
output.dataset.themeAttribute = themeAttribute;
output.textContent = document.documentElement.getAttribute(themeAttribute) ?? "system";
document.body.append(output);
