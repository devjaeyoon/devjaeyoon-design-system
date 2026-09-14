import { access, cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pagesBasePath } from "../src/site-config.ts";

const docsDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const storybookDirectory = fileURLToPath(new URL("../storybook-static/", import.meta.url));
const pagesDirectory = fileURLToPath(new URL("../pages-dist/", import.meta.url));
const pagesStorybookDirectory = fileURLToPath(new URL("../pages-dist/storybook/", import.meta.url));

await Promise.all([
  access(fileURLToPath(new URL("../dist/index.html", import.meta.url))),
  access(fileURLToPath(new URL("../storybook-static/index.html", import.meta.url))),
]);

await rm(pagesDirectory, { recursive: true, force: true });
await mkdir(pagesDirectory, { recursive: true });
await cp(docsDirectory, pagesDirectory, { recursive: true });
await mkdir(pagesStorybookDirectory, { recursive: true });
await cp(storybookDirectory, pagesStorybookDirectory, { recursive: true });

const expectedBasePath = `${pagesBasePath}/`;
const invalidUrls = [];
const htmlFiles = (await readdir(pagesDirectory, { recursive: true })).filter((file) =>
  file.endsWith(".html"),
);

for (const file of htmlFiles) {
  const html = await readFile(join(pagesDirectory, file), "utf8");

  for (const match of html.matchAll(/(?:href|src)=["'](\/(?!\/)[^"']*)["']/gu)) {
    const url = match[1];
    if (url && !url.startsWith(expectedBasePath)) invalidUrls.push(`${file}: ${url}`);
  }
}

if (invalidUrls.length > 0) {
  throw new Error(
    `Pages artifact contains URLs outside ${expectedBasePath}:\n${invalidUrls.join("\n")}`,
  );
}
