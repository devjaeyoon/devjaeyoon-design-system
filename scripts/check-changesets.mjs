import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseRef = process.argv[2];

if (!baseRef) {
  console.error("Usage: node scripts/check-changesets.mjs <base-ref>");
  process.exit(1);
}

try {
  execFileSync("git", ["cat-file", "-e", `${baseRef}:packages/design-token/package.json`], {
    stdio: "ignore",
  });
} catch {
  console.log("Skipping changeset coverage for the initial public-package baseline.");
  process.exit(0);
}

const changedFiles = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

const releasePackages = new Map([
  ["design-token", "@devjaeyoon-design-system/design-token"],
  ["css", "@devjaeyoon-design-system/css"],
  ["react", "@devjaeyoon-design-system/react"],
]);
const requiredPackages = new Set();

for (const file of changedFiles) {
  const match = file.match(/^packages\/(design-token|css|react)\/(.+)$/);
  if (!match) continue;

  const [, directory, relativePath] = match;
  if (!directory || !relativePath) continue;

  const isTest = /(?:^|\/)[^/]+\.(?:test|stories)\.[cm]?[jt]sx?$/.test(relativePath);
  const isDesignTokenSource =
    directory === "design-token" &&
    (relativePath.startsWith("tokens/") || relativePath.startsWith("scripts/"));
  const affectsRelease =
    (!isTest && relativePath.startsWith("src/")) ||
    (!isTest && isDesignTokenSource) ||
    (directory === "css" && relativePath.startsWith("scripts/")) ||
    [
      "LICENSE",
      "README.md",
      "package.json",
      "tsconfig.build.json",
      "tsconfig.json",
      "vite.config.ts",
    ].includes(relativePath);

  if (!affectsRelease) continue;

  const packageName = releasePackages.get(directory);
  if (packageName) requiredPackages.add(packageName);
  if (directory === "design-token") requiredPackages.add("@devjaeyoon-design-system/css");
}

if (requiredPackages.size === 0) process.exit(0);

const declaredPackages = new Set();
const changedChangesets = changedFiles.filter(
  (file) => /^\.changeset\/[^/]+\.md$/u.test(file) && file !== ".changeset/README.md",
);

for (const file of changedChangesets) {
  const contents = readFileSync(file, "utf8");
  const frontmatter = contents.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";

  for (const line of frontmatter.split("\n")) {
    const match = line.match(
      /^["']?(@devjaeyoon-design-system\/(?:design-token|css|react))["']?:\s*(?:patch|minor|major)$/u,
    );
    if (match?.[1]) declaredPackages.add(match[1]);
  }
}

const missingPackages = [...requiredPackages].filter(
  (packageName) => !declaredPackages.has(packageName),
);

if (missingPackages.length > 0) {
  console.error(`Missing changeset entries: ${missingPackages.join(", ")}`);
  console.error("Run `pnpm changeset` and include every affected public package.");
  process.exit(1);
}
