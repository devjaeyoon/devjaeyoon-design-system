import { semanticTokens } from "@devjaeyoon-design-system/design-token";
import { lightThemeDefinition } from "@devjaeyoon-design-system/design-token/definitions";
import lightDefinitionJson from "@devjaeyoon-design-system/design-token/definitions/light.json" with {
  type: "json",
};

if (semanticTokens["motion-duration-feedback"] !== "120ms") {
  throw new Error("The resolved root API was not available at runtime.");
}
if (lightThemeDefinition.color.bg.brand.solid.$root.$value !== "{color.palette.blue.700}") {
  throw new Error("The typed definitions API did not preserve its reference.");
}
if (lightDefinitionJson.color.bg.brand.solid.$root.$value !== "{color.palette.blue.700}") {
  throw new Error("The raw DTCG JSON export was not available at runtime.");
}
