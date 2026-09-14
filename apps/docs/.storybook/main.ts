import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import { storybookBasePath } from "../src/site-config.ts";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal(viteConfig, { configType }) {
    return mergeConfig(viteConfig, {
      base: configType === "PRODUCTION" ? storybookBasePath : "/",
    });
  },
};

export default config;
