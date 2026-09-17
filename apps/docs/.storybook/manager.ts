import { GLOBALS_UPDATED } from "storybook/internal/core-events";
import type { GlobalsUpdatedPayload } from "storybook/internal/types";
import { addons } from "storybook/manager-api";
import { darkTheme, lightTheme } from "./theme";

const setManagerTheme = (theme: unknown) => {
  addons.setConfig({ theme: theme === "dark" ? darkTheme : lightTheme });
};

setManagerTheme("light");

addons.register("devjaeyoon/theme-sync", (api) => {
  api.on(GLOBALS_UPDATED, ({ globals }: GlobalsUpdatedPayload) => {
    setManagerTheme(globals.theme);
  });
});
