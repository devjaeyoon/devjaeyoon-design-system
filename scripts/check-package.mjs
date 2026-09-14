import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const executable = (name) => (process.platform === "win32" ? `${name}.cmd` : name);

function run(command, args, options = {}) {
  const result = spawnSync(executable(command), args, { stdio: "inherit", ...options });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function getConsumerFixturePath() {
  const flagIndex = process.argv.indexOf("--consumer-fixture");
  if (flagIndex === -1) return undefined;

  const fixturePath = process.argv[flagIndex + 1];
  if (!fixturePath) throw new Error("Expected a path after --consumer-fixture.");

  return resolve(fixturePath);
}

async function checkConsumer({ fixturePath, packageName, tarballPath, temporaryDirectory }) {
  const consumerDirectory = join(temporaryDirectory, "consumer");
  const storeDirectory = join(temporaryDirectory, "pnpm-store");
  await cp(fixturePath, consumerDirectory, { recursive: true });

  const packageJsonPath = join(consumerDirectory, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.dependencies = {
    ...packageJson.dependencies,
    [packageName]: `file:${tarballPath}`,
  };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  run(
    "pnpm",
    ["install", "--offline", "--ignore-scripts", "--lockfile=false", "--store-dir", storeDirectory],
    { cwd: consumerDirectory },
  );
  run("tsc", ["--project", "tsconfig.json"], { cwd: consumerDirectory });
  run("vite", ["build"], { cwd: consumerDirectory });

  const runtimeFixture = join(consumerDirectory, "src/runtime.mjs");
  try {
    await access(runtimeFixture);
    run("node", [runtimeFixture], { cwd: consumerDirectory });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const consumerFixturePath = getConsumerFixturePath();
const packageManifest = JSON.parse(await readFile("package.json", "utf8"));

run("publint", ["--pack=false", "--strict"]);
run("pnpm", ["pack", "--dry-run"]);

const packDirectory = await mkdtemp(join(tmpdir(), "devjaeyoon-package-check-"));

try {
  run("pnpm", ["pack", "--pack-destination", packDirectory]);

  const tarballs = (await readdir(packDirectory)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1 || !tarballs[0]) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}.`);
  }

  const tarballPath = join(packDirectory, tarballs[0]);

  if (consumerFixturePath) {
    await checkConsumer({
      fixturePath: consumerFixturePath,
      packageName: packageManifest.name,
      tarballPath,
      temporaryDirectory: packDirectory,
    });
  }

  run("attw", [tarballPath, "--profile", "esm-only", "--entrypoints", "."]);
} finally {
  await rm(packDirectory, { recursive: true, force: true });
}
