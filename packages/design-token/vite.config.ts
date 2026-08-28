import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        definitions: fileURLToPath(new URL("./src/definitions.ts", import.meta.url)),
        index: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
