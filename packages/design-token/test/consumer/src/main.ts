import {
  type BuiltInThemeTokens,
  darkThemeTokens,
  lightThemeTokens,
  type MotionModeName,
  primitiveTokens,
  type SemanticTokenName,
  semanticTokens,
  type TextStyle,
  type TextStyleName,
  type ThemeName,
  type ThemeTokenName,
  type ThemeTokens,
  textStyles,
  themes,
} from "@devjaeyoon-design-system/design-token";
import {
  lightThemeDefinition,
  motionModeDefinitions,
  primitiveDefinition,
} from "@devjaeyoon-design-system/design-token/definitions";
import lightDefinitionJson from "@devjaeyoon-design-system/design-token/definitions/light.json" with {
  type: "json",
};
import primitiveDefinitionJson from "@devjaeyoon-design-system/design-token/definitions/primitive.json" with {
  type: "json",
};

const themeName: ThemeName = "dark";
const themeTokenName: ThemeTokenName = "color-bg-brand-solid";
const semanticTokenName: SemanticTokenName = "space-layout-gutter";
const textStyleName: TextStyleName = "typography-body-md-regular";
const textStyle: TextStyle = textStyles[textStyleName];
const motionModeName: MotionModeName = "reduced";
const builtInTheme: BuiltInThemeTokens = themes[themeName];
const customTheme: ThemeTokens = {
  ...lightThemeTokens,
  "color-bg-brand-solid": "#7c3aed",
};

const output = document.createElement("output");
output.textContent = JSON.stringify({
  builtInTheme,
  customTheme,
  darkThemeTokens,
  lightDefinitionJson,
  lightThemeDefinition,
  lightThemeTokens,
  motionModeDefinitions: motionModeDefinitions[motionModeName],
  primitiveTokens,
  primitiveDefinition,
  primitiveDefinitionJson,
  semanticTokenName,
  semanticTokens,
  textStyle,
  themeTokenName,
});
document.body.append(output);
