const layerOrder = "@layer djy.tokens, djy.base, djy.components;";

function kebabSegment(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[_\s]+/gu, "-")
    .toLowerCase();
}

function flatName(path) {
  return path
    .filter((segment) => segment !== "$root")
    .map(kebabSegment)
    .join("-");
}

function flattenResolvedValues(tree) {
  const values = [];
  function visit(node, path) {
    if (typeof node === "string") {
      values.push([flatName(path), node]);
      return;
    }
    for (const [name, value] of Object.entries(node)) visit(value, [...path, name]);
  }
  visit(tree, []);
  return values;
}

function collectDefinitionTokens(tree) {
  const tokens = [];
  function visit(node, path) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if ("$value" in node) {
      tokens.push({ path, token: node });
      return;
    }
    for (const [name, value] of Object.entries(node)) {
      if (name.startsWith("$") && name !== "$root") continue;
      visit(value, [...path, name]);
    }
  }
  visit(tree, []);
  return tokens;
}

function referenceVariable(reference) {
  const match = typeof reference === "string" ? reference.match(/^\{([^{}]+)\}$/u) : undefined;
  if (!match?.[1]) {
    throw new Error(`Expected a complete DTCG token reference, received ${String(reference)}.`);
  }
  return `var(--djy-${flatName(match[1].split("."))})`;
}

function declarations(entries) {
  return entries.map(([name, value]) => `    --djy-${name}: ${value};`).join("\n");
}

function semanticReferenceDeclarations(definition, filter = () => true) {
  return collectDefinitionTokens(definition)
    .filter(({ path, token }) => filter(path, token))
    .map(({ path, token }) => [flatName(path), referenceVariable(token.$value)]);
}

function typographyDeclarations(definition) {
  const propertyNames = {
    fontFamily: "font-family",
    fontSize: "font-size",
    fontWeight: "font-weight",
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
  };
  return collectDefinitionTokens(definition)
    .filter(({ token }) => token.$type === "typography")
    .flatMap(({ path, token }) =>
      Object.entries(propertyNames).map(([property, suffix]) => [
        `${flatName(path)}-${suffix}`,
        referenceVariable(token.$value[property]),
      ]),
    );
}

function directCssValue(type, value) {
  if (type === "duration") return `${value.value}${value.unit}`;
  if (type === "cubicBezier") {
    return value.join(",") === "0,0,1,1" ? "linear" : `cubic-bezier(${value.join(",")})`;
  }
  throw new Error(`Unsupported direct semantic value type: ${type}.`);
}

function reducedMotionDeclarations(definition) {
  return collectDefinitionTokens(definition).map(({ path, token }) => [
    flatName(path),
    directCssValue(token.$type, token.$value),
  ]);
}

export function generateCss({
  componentStyles,
  darkThemeDefinition,
  lightThemeDefinition,
  preferredMotionDefinition,
  primitiveTokens,
  reducedMotionDefinition,
  semanticDefinition,
}) {
  const primitives = declarations(flattenResolvedValues(primitiveTokens));
  const spacing = declarations(
    semanticReferenceDeclarations(
      semanticDefinition,
      (path, token) => path[0] === "space" && token.$type === "dimension",
    ),
  );
  const motion = declarations(semanticReferenceDeclarations(preferredMotionDefinition));
  const typography = declarations(typographyDeclarations(semanticDefinition));
  const light = declarations(semanticReferenceDeclarations(lightThemeDefinition));
  const dark = declarations(semanticReferenceDeclarations(darkThemeDefinition));
  const reducedMotion = declarations(reducedMotionDeclarations(reducedMotionDefinition));

  return `${layerOrder}

@layer djy.tokens {
  :root,
  :root[data-theme="light"] {
    color-scheme: light;
${primitives}
${spacing}
${motion}
${typography}
${light}
  }

  :root[data-theme="dark"] {
    color-scheme: dark;
${dark}
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
      color-scheme: dark;
${dark}
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
${reducedMotion}
    }
  }
}

${componentStyles}`;
}
