import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { primitiveTokens } from "@devjaeyoon-design-system/design-token";
import {
  darkThemeDefinition,
  lightThemeDefinition,
  preferredMotionDefinition,
  reducedMotionDefinition,
  semanticDefinition,
} from "@devjaeyoon-design-system/design-token/definitions";
import { generateCss } from "./css-content.mjs";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const generatedDirectory = fileURLToPath(new URL("../generated/", import.meta.url));
const componentStylesPath = fileURLToPath(new URL("../src/styles.css", import.meta.url));

const componentStyles = await readFile(componentStylesPath, "utf8");
const css = generateCss({
  componentStyles,
  darkThemeDefinition,
  lightThemeDefinition,
  preferredMotionDefinition,
  primitiveTokens,
  reducedMotionDefinition,
  semanticDefinition,
});

await mkdir(generatedDirectory, { recursive: true });
await writeFile(
  fileURLToPath(new URL("tokens.css", new URL("../generated/", import.meta.url))),
  css,
);

console.log(`Generated CSS in ${packageRoot}generated`);
