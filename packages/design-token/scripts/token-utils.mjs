import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import StyleDictionary from "style-dictionary";

export const schemaUrl = "https://www.designtokens.org/schemas/2025.10/format.json";
export const tokenFiles = {
  dark: "tokens/dark.json",
  light: "tokens/light.json",
  preferred: "tokens/preferred.json",
  primitive: "tokens/primitive.json",
  reduced: "tokens/reduced.json",
  semantic: "tokens/semantic.json",
};

const allowedTypes = new Set([
  "color",
  "cubicBezier",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "number",
  "typography",
]);
const semanticFiles = new Set([
  "dark.json",
  "light.json",
  "preferred.json",
  "reduced.json",
  "semantic.json",
]);
const tokenPropertyNames = new Set([
  "$deprecated",
  "$description",
  "$extensions",
  "$type",
  "$value",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isReference(value) {
  return typeof value === "string" && /^\{[^{}]+\}$/u.test(value);
}

function referencePath(value) {
  return isReference(value) ? value.slice(1, -1) : undefined;
}

export function kebabSegment(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[_\s]+/gu, "-")
    .toLowerCase();
}

export function flatTokenName(path) {
  return path
    .filter((segment) => segment !== "$root")
    .map(kebabSegment)
    .join("-");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateColor(value, path) {
  if (isReference(value)) return;
  assert(isPlainObject(value), `${path} must contain a DTCG color object.`);
  assert(value.colorSpace === "srgb", `${path} must use the srgb color space.`);
  assert(
    Array.isArray(value.components) && value.components.length === 3,
    `${path} must have three color components.`,
  );
  assert(
    value.components.every(
      (component) => typeof component === "number" && component >= 0 && component <= 1,
    ),
    `${path} color components must be numbers between 0 and 1.`,
  );
  assert(
    value.alpha === undefined ||
      (typeof value.alpha === "number" && value.alpha >= 0 && value.alpha <= 1),
    `${path} alpha must be between 0 and 1.`,
  );
  assert(
    value.hex === undefined || /^#[0-9a-f]{6}$/iu.test(value.hex),
    `${path} hex metadata must be a six-digit hex color.`,
  );
}

function validateDimension(value, path) {
  if (isReference(value)) return;
  assert(isPlainObject(value), `${path} must contain a DTCG dimension object.`);
  assert(
    typeof value.value === "number" && Number.isFinite(value.value),
    `${path} dimension value must be finite.`,
  );
  assert(["em", "px", "rem"].includes(value.unit), `${path} has an unsupported dimension unit.`);
}

function validateDuration(value, path) {
  if (isReference(value)) return;
  assert(isPlainObject(value), `${path} must contain a DTCG duration object.`);
  assert(
    typeof value.value === "number" && value.value >= 0,
    `${path} duration must be non-negative.`,
  );
  assert(["ms", "s"].includes(value.unit), `${path} has an unsupported duration unit.`);
}

function validateCubicBezier(value, path) {
  if (isReference(value)) return;
  assert(
    Array.isArray(value) && value.length === 4,
    `${path} must contain four cubic-bezier coordinates.`,
  );
  assert(
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)),
    `${path} cubic-bezier coordinates must be finite.`,
  );
  assert(
    value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1,
    `${path} cubic-bezier x coordinates must be between 0 and 1.`,
  );
}

function validateTypography(value, path) {
  assert(isPlainObject(value), `${path} must contain a DTCG typography composite.`);
  const expected = ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"];
  assert(
    Object.keys(value).sort().join(",") === expected.sort().join(","),
    `${path} has an invalid typography shape.`,
  );
  for (const property of expected) {
    assert(isReference(value[property]), `${path}.${property} must reference a primitive token.`);
  }
}

function validateValue(type, value, path) {
  if (type === "color") return validateColor(value, path);
  if (type === "dimension") return validateDimension(value, path);
  if (type === "duration") return validateDuration(value, path);
  if (type === "cubicBezier") return validateCubicBezier(value, path);
  if (type === "typography") return validateTypography(value, path);
  if (type === "fontFamily") {
    assert(
      typeof value === "string" ||
        (Array.isArray(value) &&
          value.length > 0 &&
          value.every((item) => typeof item === "string")),
      `${path} must contain a font family or stack.`,
    );
    return;
  }
  if (type === "fontWeight") {
    assert(
      (typeof value === "number" && value >= 1 && value <= 1000) || typeof value === "string",
      `${path} has an invalid font weight.`,
    );
    return;
  }
  if (type === "number") {
    assert(
      typeof value === "number" && Number.isFinite(value),
      `${path} must contain a finite number.`,
    );
  }
}

function collectReferences(value, references = []) {
  if (isReference(value)) {
    references.push(referencePath(value));
  } else if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, references);
  } else if (isPlainObject(value)) {
    for (const item of Object.values(value)) collectReferences(item, references);
  }
  return references;
}

function validateSemanticName(fileName, name) {
  const intent = "(?:brand|critical|warning|positive|informative)";
  const colorPatterns = [
    /^color-fg-(?:neutral(?:-(?:muted|subtle|inverse))?|disabled|placeholder|brand|critical|warning|positive|informative|on-(?:neutral|brand|critical|warning|positive|informative))$/u,
    new RegExp(
      `^color-bg-(?:canvas|surface|elevated|overlay|overlay-muted|disabled|selected(?:-(?:hover|pressed))?|transparent(?:-(?:hover|pressed))?|neutral-(?:solid|weak|inverse)(?:-(?:hover|pressed))?|${intent}-(?:solid|weak)(?:-(?:hover|pressed))?)$`,
      "u",
    ),
    new RegExp(
      `^color-stroke-(?:neutral-(?:solid|weak|subtle)|disabled|focus|${intent}-(?:solid|weak))$`,
      "u",
    ),
  ];
  const patterns = {
    "dark.json": colorPatterns,
    "light.json": colorPatterns,
    "preferred.json": [/^motion-(?:duration|easing)-(?:feedback|enter|exit)$/u],
    "reduced.json": [/^motion-(?:duration|easing)-(?:feedback|enter|exit)$/u],
    "semantic.json": [
      /^radius-control$/u,
      /^size-control-(?:sm|md|lg)$/u,
      /^space-layout-(?:gutter|section-(?:sm|md|lg))$/u,
      /^space-content-stack-(?:sm|md|lg)$/u,
      /^typography-(?:display|heading)-(?:lg|md|sm)-strong$/u,
      /^typography-(?:title|body|label|caption)-(?:lg|md|sm)-(?:regular|strong)$/u,
    ],
  };
  assert(
    patterns[fileName]?.some((pattern) => pattern.test(name)),
    `${fileName} contains an unsupported semantic token name: ${name}.`,
  );
}

export function collectRawTokens(tree) {
  const tokens = [];
  function visit(node, path) {
    if (!isPlainObject(node)) return;
    if ("$value" in node) {
      tokens.push({ node, path });
      return;
    }
    for (const [name, value] of Object.entries(node)) {
      if (["$description", "$extensions", "$schema", "$type"].includes(name)) continue;
      visit(value, [...path, name]);
    }
  }
  visit(tree, []);
  return tokens;
}

export function validateTokenTree(tree, fileName) {
  assert(tree.$schema === schemaUrl, `${fileName} must declare the DTCG 2025.10 schema.`);
  const requiresDescriptions = semanticFiles.has(fileName);
  const tokens = collectRawTokens(tree);
  assert(tokens.length > 0, `${fileName} must contain at least one token.`);

  function validateGroups(node, path = []) {
    if (!isPlainObject(node)) return;
    if ("$value" in node) {
      const extraProperties = Object.keys(node).filter((name) => !tokenPropertyNames.has(name));
      assert(
        extraProperties.length === 0,
        `${path.join(".")} mixes token properties with child tokens.`,
      );
      return;
    }
    for (const [name, value] of Object.entries(node)) {
      if (
        name.startsWith("$") &&
        !["$description", "$extensions", "$root", "$schema", "$type"].includes(name)
      ) {
        throw new Error(`${[...path, name].join(".")} is not an allowed group property.`);
      }
      if (!name.startsWith("$")) {
        assert(
          /^(?:[a-z][a-zA-Z0-9]*(?:-[a-z0-9]+)*|[0-9]+)$/u.test(name),
          `${[...path, name].join(".")} has an invalid token name segment.`,
        );
      }
      validateGroups(value, [...path, name]);
    }
  }
  validateGroups(tree);

  for (const { node, path } of tokens) {
    const displayPath = path.join(".");
    assert(
      typeof node.$type === "string" && allowedTypes.has(node.$type),
      `${displayPath} has an invalid or missing $type.`,
    );
    if (requiresDescriptions) {
      assert(
        typeof node.$description === "string" && node.$description.trim().length > 0,
        `${displayPath} must define $description.`,
      );
    }
    validateValue(node.$type, node.$value, displayPath);
    if (requiresDescriptions) validateSemanticName(fileName, flatTokenName(path));
  }
  return tokens;
}

export async function loadTokenTrees(packageRoot) {
  const entries = await Promise.all(
    Object.entries(tokenFiles).map(async ([name, file]) => {
      const contents = await readFile(resolve(packageRoot, file), "utf8");
      return [name, JSON.parse(contents)];
    }),
  );
  return Object.fromEntries(entries);
}

function validateReferenceGraph(trees, names) {
  const tokens = new Map();
  for (const name of names) {
    for (const item of collectRawTokens(trees[name])) {
      const path = item.path.join(".");
      assert(!tokens.has(path), `Duplicate token path in source composition: ${path}.`);
      tokens.set(path, item.node);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(path) {
    if (visited.has(path)) return;
    assert(tokens.has(path), `Unresolved token reference: {${path}}.`);
    assert(!visiting.has(path), `Circular token reference detected at {${path}}.`);
    visiting.add(path);
    for (const reference of collectReferences(tokens.get(path).$value)) visit(reference);
    visiting.delete(path);
    visited.add(path);
  }
  for (const path of tokens.keys()) visit(path);
}

export function validateCatalog(trees) {
  for (const [name, tree] of Object.entries(trees)) {
    validateTokenTree(tree, basename(tokenFiles[name]));
  }
  validateReferenceGraph(trees, ["primitive", "semantic", "preferred"]);
  validateReferenceGraph(trees, ["primitive", "light"]);
  validateReferenceGraph(trees, ["primitive", "dark"]);
  validateReferenceGraph(trees, ["primitive", "reduced"]);

  const namesFor = (name) =>
    collectRawTokens(trees[name])
      .map(({ path }) => flatTokenName(path))
      .sort();
  const intents = ["brand", "critical", "warning", "positive", "informative"];
  const expectedColorNames = [
    "color-fg-neutral",
    "color-fg-neutral-muted",
    "color-fg-neutral-subtle",
    "color-fg-neutral-inverse",
    "color-fg-disabled",
    "color-fg-placeholder",
    ...intents.map((intent) => `color-fg-${intent}`),
    "color-fg-on-neutral",
    ...intents.map((intent) => `color-fg-on-${intent}`),
    ...["canvas", "surface", "elevated", "overlay", "overlay-muted", "disabled"].map(
      (role) => `color-bg-${role}`,
    ),
    ...["selected", "transparent"].flatMap((role) => [
      `color-bg-${role}`,
      `color-bg-${role}-hover`,
      `color-bg-${role}-pressed`,
    ]),
    ...["solid", "weak", "inverse"].flatMap((strength) => [
      `color-bg-neutral-${strength}`,
      `color-bg-neutral-${strength}-hover`,
      `color-bg-neutral-${strength}-pressed`,
    ]),
    ...intents.flatMap((intent) =>
      ["solid", "weak"].flatMap((strength) => [
        `color-bg-${intent}-${strength}`,
        `color-bg-${intent}-${strength}-hover`,
        `color-bg-${intent}-${strength}-pressed`,
      ]),
    ),
    "color-stroke-neutral-solid",
    "color-stroke-neutral-weak",
    "color-stroke-neutral-subtle",
    "color-stroke-disabled",
    "color-stroke-focus",
    ...intents.flatMap((intent) => [`color-stroke-${intent}-solid`, `color-stroke-${intent}-weak`]),
  ].sort();
  const expectedMotionNames = ["feedback", "enter", "exit"]
    .flatMap((purpose) => [`motion-duration-${purpose}`, `motion-easing-${purpose}`])
    .sort();
  const expectedTextStyleNames = [
    ...["display", "heading"].flatMap((role) =>
      ["lg", "md", "sm"].map((size) => `typography-${role}-${size}-strong`),
    ),
    ...["title", "body", "label", "caption"].flatMap((role) =>
      ["lg", "md", "sm"].flatMap((size) => [
        `typography-${role}-${size}-regular`,
        `typography-${role}-${size}-strong`,
      ]),
    ),
  ];
  const expectedCoreNames = [
    "radius-control",
    "size-control-sm",
    "size-control-md",
    "size-control-lg",
    "space-layout-gutter",
    "space-layout-section-sm",
    "space-layout-section-md",
    "space-layout-section-lg",
    "space-content-stack-sm",
    "space-content-stack-md",
    "space-content-stack-lg",
    ...expectedTextStyleNames,
  ].sort();
  assert(
    JSON.stringify(namesFor("light")) === JSON.stringify(namesFor("dark")),
    "Light and dark color token names must match exactly.",
  );
  assert(
    JSON.stringify(namesFor("preferred")) === JSON.stringify(namesFor("reduced")),
    "Preferred and reduced motion token names must match exactly.",
  );
  assert(
    JSON.stringify(namesFor("light")) === JSON.stringify(expectedColorNames),
    "Theme color token names must match the public naming contract exactly.",
  );
  assert(
    JSON.stringify(namesFor("preferred")) === JSON.stringify(expectedMotionNames),
    "Motion token names must match the public naming contract exactly.",
  );
  assert(
    JSON.stringify(namesFor("semantic")) === JSON.stringify(expectedCoreNames),
    "Core semantic token names must match the public naming contract exactly.",
  );
}

export async function exportResolved(packageRoot, names) {
  const dictionary = new StyleDictionary({
    source: names.map((name) => resolve(packageRoot, tokenFiles[name])),
    usesDtcg: true,
    platforms: { raw: { transforms: [] } },
  });
  await dictionary.hasInitialized;
  return dictionary.exportPlatform("raw");
}

export function collectResolvedTokens(tree) {
  const tokens = [];
  function visit(node) {
    if (!isPlainObject(node)) return;
    if ("$value" in node && Array.isArray(node.path)) {
      tokens.push(node);
      return;
    }
    for (const value of Object.values(node)) visit(value);
  }
  visit(tree);
  return tokens;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

export function cssValue(type, value) {
  if (type === "color") {
    const alpha = value.alpha ?? 1;
    if (alpha === 0) return "transparent";
    if (alpha === 1 && value.hex) return value.hex.toLowerCase();
    const [red, green, blue] = value.components.map((component) => Math.round(component * 255));
    return `rgb(${red} ${green} ${blue} / ${formatNumber(alpha * 100)}%)`;
  }
  if (type === "dimension" || type === "duration") {
    return `${formatNumber(value.value)}${value.unit}`;
  }
  if (type === "cubicBezier") {
    return value.join(",") === "0,0,1,1"
      ? "linear"
      : `cubic-bezier(${value.map(formatNumber).join(",")})`;
  }
  if (type === "fontFamily") {
    const families = Array.isArray(value) ? value : [value];
    return families.map((family) => (/\s/u.test(family) ? `"${family}"` : family)).join(", ");
  }
  if (type === "fontWeight" || type === "number") return formatNumber(value);
  if (type === "typography") {
    return {
      fontFamily: cssValue("fontFamily", value.fontFamily),
      fontSize: cssValue("dimension", value.fontSize),
      fontWeight: cssValue("fontWeight", value.fontWeight),
      letterSpacing: cssValue("dimension", value.letterSpacing),
      lineHeight: cssValue("number", value.lineHeight),
    };
  }
  throw new Error(`Unsupported CSS token type: ${type}.`);
}

export function resolvedTokensFromFile(tree, fileName) {
  return collectResolvedTokens(tree).filter((token) => basename(token.filePath) === fileName);
}

export function resolvedFlatMap(tokens) {
  return Object.fromEntries(
    tokens.map((token) => [flatTokenName(token.path), cssValue(token.$type, token.$value)]),
  );
}

export function resolvedNestedMap(tokens) {
  const output = {};
  for (const token of tokens) {
    const path = token.path.filter((segment) => segment !== "$root");
    let cursor = output;
    for (const segment of path.slice(0, -1)) cursor = cursor[segment] ??= {};
    cursor[path.at(-1)] = cssValue(token.$type, token.$value);
  }
  return output;
}
