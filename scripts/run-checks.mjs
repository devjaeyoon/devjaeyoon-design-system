import { spawnSync } from "node:child_process";

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const checks = ["format:check", "lint", "typecheck", "test", "test:stories", "build", "pack:check"];

for (const check of checks) {
  const result = spawnSync(packageManager, ["run", check], { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
