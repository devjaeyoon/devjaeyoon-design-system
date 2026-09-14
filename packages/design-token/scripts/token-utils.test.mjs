import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectRawTokens,
  flatTokenName,
  loadTokenTrees,
  validateCatalog,
  validateTokenTree,
} from "./token-utils.mjs";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const trees = await loadTokenTrees(packageRoot);

describe("DTCG catalog validation", () => {
  it("parses and validates every source offline", () => {
    expect(() => validateCatalog(trees)).not.toThrow();
  });

  it("rejects unresolved and circular references", () => {
    const unresolved = structuredClone(trees);
    unresolved.preferred.motion.duration.feedback.$value = "{motion.duration.missing}";
    expect(() => validateCatalog(unresolved)).toThrow(/Unresolved token reference/u);

    const circular = structuredClone(trees);
    circular.primitive.motion.duration.fast.$value = "{motion.duration.normal}";
    circular.primitive.motion.duration.normal.$value = "{motion.duration.fast}";
    expect(() => validateCatalog(circular)).toThrow(/Circular token reference/u);
  });

  it("rejects invalid types, values, and semantic names", () => {
    const invalidType = structuredClone(trees.primitive);
    invalidType.space[1].$type = "spacing";
    expect(() => validateTokenTree(invalidType, "primitive.json")).toThrow(
      /invalid or missing \$type/u,
    );

    const invalidValue = structuredClone(trees.primitive);
    invalidValue.space[1].$value = { unit: "pixels", value: 4 };
    expect(() => validateTokenTree(invalidValue, "primitive.json")).toThrow(
      /unsupported dimension unit/u,
    );

    const invalidName = structuredClone(trees.semantic);
    invalidName.space.layout["page-padding"] = invalidName.space.layout.gutter;
    delete invalidName.space.layout.gutter;
    expect(() => validateTokenTree(invalidName, "semantic.json")).toThrow(
      /unsupported semantic token name/u,
    );
  });

  it("keeps theme and motion-mode key sets identical", () => {
    const names = (tree) =>
      collectRawTokens(tree)
        .map(({ path }) => flatTokenName(path))
        .sort();
    expect(names(trees.dark)).toEqual(names(trees.light));
    expect(names(trees.reduced)).toEqual(names(trees.preferred));
  });
});
