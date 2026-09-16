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
  assert.match(css, /\.djy-icon-button/u);
  assert.match(css, /\.djy-button--outline/u);
  assert.match(css, /\.djy-button--danger/u);
  assert.match(css, /--djy-size-control-lg/u);
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

async function assertColor(locator, property, token) {
  await locator.evaluate(
    async (element, { property, token }) => {
      // Wait for CSS transitions to settle, then resolve the token in this element's scope.
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
      const probe = document.createElement("span");
      probe.style.color = `var(${token})`;
      element.append(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      const actual = getComputedStyle(element)[property];
      if (actual !== expected)
        throw new Error(`${property}: expected ${expected}, received ${actual}`);
    },
    { property, token },
  );
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

    const icon = page.getByRole("button", { name: "Delete item", exact: true });
    const actions = page.getByTestId("actions");
    await page.getByRole("button", { name: "Preview profile" }).click();
    assert.equal(await actions.textContent(), "Actions: 1");
    await icon.click();
    await icon.press("Enter");
    await icon.press("Space");
    assert.equal(await actions.textContent(), "Actions: 4");
    assert.equal(await icon.getAttribute("data-ref"), "received");
    assert.equal(await icon.getAttribute("type"), "button");
    assert.equal(await icon.getAttribute("name"), "intent");
    assert.equal(await icon.getAttribute("value"), "delete");
    const iconStyle = await icon.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: style.width, height: style.height, radius: style.borderRadius };
    });
    assert.deepEqual(iconStyle, { width: "52px", height: "52px", radius: "12px" });

    // Native default buttons must not submit the form, even with valid changed input.
    await input.fill("Grace Hopper");
    await icon.click();
    await page.getByRole("button", { name: "Preview profile" }).click();
    assert.equal(await status.textContent(), "Saved Ada Lovelace");
    let count = 6;
    for (const toggle of ["Toggle disabled", "Toggle loading"]) {
      await page.getByRole("button", { name: toggle }).click();
      assert.equal(await icon.isDisabled(), true);
      // A physical pointer click reaches the disabled element without Playwright's enabled wait.
      const bounds = await icon.boundingBox();
      assert.ok(bounds);
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      assert.equal(await actions.textContent(), `Actions: ${count}`);
      if (toggle === "Toggle loading") {
        assert.equal(await icon.getAttribute("aria-busy"), "true");
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(
          await icon
            .locator(".djy-button__spinner")
            .evaluate((element) => getComputedStyle(element).animationName),
          "none",
        );
      }
      await page.getByRole("button", { name: toggle }).click();
      assert.equal(await icon.isDisabled(), false);
      await icon.click();
      count += 1;
      assert.equal(await actions.textContent(), `Actions: ${count}`);
    }

    for (const theme of ["light", "dark"]) {
      await page.locator("html").evaluate((element, value) => {
        element.dataset.theme = value;
      }, theme);
      for (const tone of ["default", "danger"]) {
        for (const variant of ["primary", "secondary", "outline", "ghost"]) {
          const button = page.getByTestId(`${tone}-${variant}`);
          const family = tone === "danger" ? "critical" : "brand";
          const background =
            variant === "primary"
              ? `${family}-solid`
              : variant === "secondary"
                ? `${tone === "danger" ? "critical" : "neutral"}-weak`
                : "transparent";
          const state =
            tone === "danger" && ["outline", "ghost"].includes(variant)
              ? "critical-weak"
              : background;
          await assertColor(button, "backgroundColor", `--djy-color-bg-${background}`);
          await button.hover();
          await assertColor(button, "backgroundColor", `--djy-color-bg-${state}-hover`);
          await page.mouse.down();
          try {
            await assertColor(button, "backgroundColor", `--djy-color-bg-${state}-pressed`);
            assert.equal(
              await button.evaluate((element) => getComputedStyle(element).transform),
              "none",
            );
          } finally {
            await page.mouse.up();
          }
          await page.mouse.move(0, 0);
        }
      }
      for (const id of ["neutral-primary", "neutral-icon"]) {
        const neutral = page.getByTestId(id);
        await assertColor(neutral, "backgroundColor", "--djy-color-bg-neutral-solid");
        await neutral.hover();
        await assertColor(neutral, "backgroundColor", "--djy-color-bg-neutral-solid-hover");
        await page.mouse.down();
        try {
          await assertColor(neutral, "backgroundColor", "--djy-color-bg-neutral-solid-pressed");
        } finally {
          await page.mouse.up();
        }
        await page.mouse.move(0, 0);
      }
      await assertColor(
        page.getByTestId("neutral-danger"),
        "backgroundColor",
        "--djy-color-bg-critical-solid",
      );
      await assertColor(
        page.getByTestId("default-primary"),
        "backgroundColor",
        "--djy-color-bg-brand-solid",
      );
    }

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      for (const [rootSize, zoom] of [
        ["16px", "1"],
        ["32px", "1"],
        ["16px", "2"],
      ]) {
        await page.locator("html").evaluate(
          (element, { fontSize, zoom }) => {
            element.style.fontSize = fontSize;
            element.style.zoom = zoom;
          },
          { fontSize: rootSize, zoom },
        );
        const dimensions = await page.getByTestId("long-label").evaluate((element) => ({
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          height: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));
        assert.ok(dimensions.scrollWidth <= dimensions.width);
        assert.ok(dimensions.scrollHeight <= dimensions.height);
        assert.equal(
          await icon.evaluate((element) => element.getBoundingClientRect().width),
          (rootSize === "16px" ? 52 : 104) * Number(zoom),
        );
        const overflowing = await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .filter((element) => element.getBoundingClientRect().right > window.innerWidth)
            .map(
              (element) =>
                `${element.tagName}.${element.className}: ${element.textContent?.slice(0, 60)}`,
            ),
        );
        const pageOverflow = await page.locator("html").evaluate((element) => ({
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          textOverflow: Array.from(document.querySelectorAll("body *"))
            .filter(
              (child) =>
                !child.classList.contains("djy-sr-only") && child.scrollWidth > child.clientWidth,
            )
            .map(
              (child) =>
                `${child.tagName}.${child.className}: ${child.scrollWidth}/${child.clientWidth}`,
            ),
        }));
        if (overflowing.length || pageOverflow.scrollWidth > pageOverflow.clientWidth)
          await page.screenshot({ path: "/tmp/button-consumer-overflow.png", fullPage: true });
        assert.deepEqual(overflowing, [], `${viewport.width}px, root ${rootSize}, zoom ${zoom}`);
        assert.ok(
          pageOverflow.scrollWidth <= pageOverflow.clientWidth,
          JSON.stringify({ viewport, rootSize, zoom, ...pageOverflow }),
        );
      }
    }
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
