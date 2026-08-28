import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const publicEntryPath = fileURLToPath(new URL("./src/index.ts", import.meta.url));
const generatedCssPath = fileURLToPath(new URL("./generated/tokens.css", import.meta.url));

function includeGeneratedCss(): Plugin {
  return {
    name: "include-generated-css",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      if (id === publicEntryPath) {
        return `import ${JSON.stringify(generatedCssPath)};\n${code}`;
      }
    },
  };
}

function injectExtractedCss(): Plugin {
  return {
    name: "inject-extracted-css",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk" && output.isEntry) {
          output.code = `import "./index.css";\n${output.code}`;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [includeGeneratedCss(), injectExtractedCss()],
  build: {
    lib: {
      entry: publicEntryPath,
      formats: ["es"],
      fileName: "index",
      cssFileName: "index",
    },
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
