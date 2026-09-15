import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const packageDirectory = resolve(fileURLToPath(new URL("../", import.meta.url)));
const cssPackageDirectory = resolve(packageDirectory, "../css");
const fixtureDirectory = join(packageDirectory, "test/consumer");
const executable = (name) => (process.platform === "win32" ? `${name}.cmd` : name);

function run(command, args, options = {}) {
  const result = spawnSync(executable(command), args, { stdio: "inherit", ...options });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? 1}.`);
  }

  return result;
}

async function packPackage(packagePath, destination) {
  await mkdir(destination, { recursive: true });
  run("pnpm", ["pack", "--pack-destination", destination], { cwd: packagePath });

  const tarballs = (await readdir(destination)).filter((file) => file.endsWith(".tgz"));
  assert.equal(tarballs.length, 1, `Expected one tarball in ${destination}.`);

  return join(destination, tarballs[0]);
}

async function readInstalledVersion(packageName) {
  const manifestPath = join(packageDirectory, "node_modules", packageName, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(typeof manifest.version, "string", `Expected a version for ${packageName}.`);
  return manifest.version;
}

async function createConsumer(temporaryDirectory, reactTarball, cssTarball) {
  const consumerDirectory = join(temporaryDirectory, "consumer");
  await cp(fixtureDirectory, consumerDirectory, { recursive: true });

  const packageJsonPath = join(consumerDirectory, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.dependencies = {
    "@devjaeyoon-design-system/css": `file:${cssTarball}`,
    "@devjaeyoon-design-system/react": `file:${reactTarball}`,
    react: await readInstalledVersion("react"),
    "react-dom": await readInstalledVersion("react-dom"),
  };
  packageJson.devDependencies = {
    "@types/react": await readInstalledVersion("@types/react"),
    "@types/react-dom": await readInstalledVersion("@types/react-dom"),
  };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return consumerDirectory;
}

function assertConsumerResolution(consumerDirectory) {
  const consumerRequire = createRequire(join(consumerDirectory, "package.json"));
  const nodeModulesDirectory = join(consumerDirectory, "node_modules");
  const specifiers = [
    "@devjaeyoon-design-system/css",
    "@devjaeyoon-design-system/css/styles.css",
    "@devjaeyoon-design-system/react",
    "react",
    "react-dom/client",
  ];

  for (const specifier of specifiers) {
    const resolvedPath = consumerRequire.resolve(specifier);
    const relativePath = relative(nodeModulesDirectory, resolvedPath);
    assert.ok(
      relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath),
      `${specifier} resolved outside the consumer app: ${resolvedPath}`,
    );
  }
}

async function assertCssBundle(consumerDirectory) {
  const assetsDirectory = join(consumerDirectory, "dist/assets");
  const cssFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith(".css"));
  assert.ok(cssFiles.length > 0, "Expected the production build to contain CSS.");

  const css = (
    await Promise.all(cssFiles.map((file) => readFile(join(assetsDirectory, file), "utf8")))
  ).join("\n");
  assert.match(css, /--djy-color-bg-surface/u);
  assert.match(css, /\.djy-text-field__input/u);
  assert.match(css, /\.djy-button/u);
}

async function getInputStyles(input) {
  return input.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      minHeight: style.minHeight,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
}

async function checkBrowser(consumerDirectory) {
  const runtimeErrors = [];
  let browser;
  let server;

  try {
    server = await preview({
      logLevel: "silent",
      preview: { host: "127.0.0.1", port: 0, strictPort: false },
      root: consumerDirectory,
    });
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== "string", "Expected Vite preview to bind a TCP port.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => runtimeErrors.push(`page: ${error.message}`));
    page.on("requestfailed", (request) => {
      if (["script", "stylesheet"].includes(request.resourceType())) {
        runtimeErrors.push(
          `request: ${request.url()} (${request.failure()?.errorText ?? "failed"})`,
        );
      }
    });
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        ["script", "stylesheet"].includes(response.request().resourceType())
      ) {
        runtimeErrors.push(`response: ${response.url()} (${response.status()})`);
      }
    });

    await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: "networkidle" });

    const input = page.getByRole("textbox", { name: "Name (필수)" });
    const submitButton = page.getByRole("button", { name: "Save profile" });
    const status = page.getByRole("status");
    await input.waitFor({ state: "visible" });
    assert.equal(await status.textContent(), "No profile saved yet.");

    await page.locator('label[for="consumer-name"]').click();
    assert.equal(await input.evaluate((element) => element === document.activeElement), true);
    await input.pressSequentially("Ada Lovelace");
    await page.keyboard.press("Tab");
    assert.equal(
      await submitButton.evaluate((element) => element === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    await status.filter({ hasText: "Saved Ada Lovelace" }).waitFor();

    await page.keyboard.press("Shift+Tab");
    assert.equal(await input.evaluate((element) => element === document.activeElement), true);
    const lightStyles = await getInputStyles(input);
    assert.equal(lightStyles.minHeight, "40px");
    assert.equal(lightStyles.borderStyle, "solid");
    assert.equal(lightStyles.borderWidth, "1px");
    assert.equal(lightStyles.outlineStyle, "solid");
    assert.equal(lightStyles.outlineWidth, "3px");

    await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.locator('html[data-theme="dark"]').waitFor();
    const darkStyles = await getInputStyles(input);
    assert.notEqual(darkStyles.backgroundColor, lightStyles.backgroundColor);
    assert.equal(
      await page.locator("html").evaluate((element) => getComputedStyle(element).colorScheme),
      "dark",
    );

    assert.deepEqual(runtimeErrors, []);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "devjaeyoon-react-consumer-"));

try {
  const reactTarball = await packPackage(packageDirectory, join(temporaryDirectory, "react"));
  const cssTarball = await packPackage(cssPackageDirectory, join(temporaryDirectory, "css"));
  const consumerDirectory = await createConsumer(temporaryDirectory, reactTarball, cssTarball);

  run(
    "pnpm",
    [
      "install",
      "--prefer-offline",
      "--ignore-scripts",
      "--lockfile=false",
      "--strict-peer-dependencies",
      "--config.auto-install-peers=false",
    ],
    { cwd: consumerDirectory },
  );
  assertConsumerResolution(consumerDirectory);

  run(join(packageDirectory, "node_modules/.bin/tsc"), ["--project", "tsconfig.json"], {
    cwd: consumerDirectory,
  });
  run(join(packageDirectory, "node_modules/.bin/vite"), ["build"], {
    cwd: consumerDirectory,
  });
  await assertCssBundle(consumerDirectory);
  run("node", ["src/ssr.mjs"], { cwd: consumerDirectory });
  await checkBrowser(consumerDirectory);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
