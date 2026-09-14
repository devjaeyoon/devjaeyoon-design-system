import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  exportResolved,
  loadTokenTrees,
  resolvedFlatMap,
  resolvedNestedMap,
  resolvedTokensFromFile,
  validateCatalog,
} from "./token-utils.mjs";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const generatedDirectory = fileURLToPath(new URL("../src/generated/", import.meta.url));
const trees = await loadTokenTrees(packageRoot);

validateCatalog(trees);

const core = await exportResolved(packageRoot, ["primitive", "semantic", "preferred"]);
const light = await exportResolved(packageRoot, ["primitive", "light"]);
const dark = await exportResolved(packageRoot, ["primitive", "dark"]);

const primitiveTokens = resolvedNestedMap(resolvedTokensFromFile(core, "primitive.json"));
const coreSemanticTokens = resolvedTokensFromFile(core, "semantic.json");
const semanticTokens = {
  ...resolvedFlatMap(coreSemanticTokens.filter((token) => token.path[0] === "space")),
  ...resolvedFlatMap(resolvedTokensFromFile(core, "preferred.json")),
};
const textStyles = resolvedFlatMap(
  coreSemanticTokens.filter((token) => token.path[0] === "typography"),
);
const lightThemeTokens = resolvedFlatMap(resolvedTokensFromFile(light, "light.json"));
const darkThemeTokens = resolvedFlatMap(resolvedTokensFromFile(dark, "dark.json"));

const source = `export const primitiveTokens = ${JSON.stringify(primitiveTokens, null, 2)} as const;

export const semanticTokens = ${JSON.stringify(semanticTokens, null, 2)} as const;

export type SemanticTokenName = keyof typeof semanticTokens;

export type TextStyle = Readonly<{
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  lineHeight: string;
}>;

export const textStyles = ${JSON.stringify(textStyles, null, 2)} as const satisfies Readonly<Record<string, TextStyle>>;

export type TextStyleName = keyof typeof textStyles;

export const lightThemeTokens = ${JSON.stringify(lightThemeTokens, null, 2)} as const;

export type ThemeTokenName = keyof typeof lightThemeTokens;
export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

export const darkThemeTokens = ${JSON.stringify(darkThemeTokens, null, 2)} as const satisfies ThemeTokens;

export const themes = {
  light: lightThemeTokens,
  dark: darkThemeTokens,
} as const;

export type ThemeName = keyof typeof themes;
export type BuiltInThemeTokens = (typeof themes)[ThemeName];
export type MotionModeName = "preferred" | "reduced";
`;

const definitionsSource = `export const primitiveDefinition = ${JSON.stringify(trees.primitive, null, 2)} as const;

export const semanticDefinition = ${JSON.stringify(trees.semantic, null, 2)} as const;

export const lightThemeDefinition = ${JSON.stringify(trees.light, null, 2)} as const;

export const darkThemeDefinition = ${JSON.stringify(trees.dark, null, 2)} as const;

export const preferredMotionDefinition = ${JSON.stringify(trees.preferred, null, 2)} as const;

export const reducedMotionDefinition = ${JSON.stringify(trees.reduced, null, 2)} as const;

export const themeDefinitions = {
  light: lightThemeDefinition,
  dark: darkThemeDefinition,
} as const;

export const motionModeDefinitions = {
  preferred: preferredMotionDefinition,
  reduced: reducedMotionDefinition,
} as const;
`;

await mkdir(generatedDirectory, { recursive: true });
await Promise.all([
  writeFile(new URL("../src/generated/root.ts", import.meta.url), source),
  writeFile(new URL("../src/generated/definitions.ts", import.meta.url), definitionsSource),
]);

console.log("Generated typed design-token modules from DTCG sources.");
