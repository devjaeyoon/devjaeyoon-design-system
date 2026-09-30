import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, defineProject } from "vitest/config";

const supportedBrowsers = ["chromium", "firefox", "webkit"] as const;
type SupportedBrowser = (typeof supportedBrowsers)[number];

function isSupportedBrowser(browser: string): browser is SupportedBrowser {
  return supportedBrowsers.some((supportedBrowser) => supportedBrowser === browser);
}

function getTestBrowser(): SupportedBrowser {
  const browser = process.env.DS_TEST_BROWSER ?? "chromium";
  if (isSupportedBrowser(browser)) return browser;
  throw new Error(
    `Unsupported DS_TEST_BROWSER "${browser}". Expected one of: ${supportedBrowsers.join(", ")}.`,
  );
}

export default defineConfig({
  test: {
    projects: [
      defineProject({
        plugins: [react()],
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
        },
      }),
      defineProject({
        plugins: [
          react(),
          storybookTest({
            configDir: fileURLToPath(new URL("./.storybook", import.meta.url)),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            instances: [{ browser: getTestBrowser() }],
          },
        },
      }),
    ],
  },
});
