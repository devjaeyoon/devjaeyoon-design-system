import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tokenFiles } from "./token-utils.mjs";

const packageRoot = new URL("../", import.meta.url);
const outputDirectory = new URL("../dist/definitions/", import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  Object.values(tokenFiles).map((file) =>
    copyFile(new URL(file, packageRoot), new URL(file.replace("tokens/", ""), outputDirectory)),
  ),
);

console.log(`Copied raw DTCG JSON to ${fileURLToPath(outputDirectory)}.`);
