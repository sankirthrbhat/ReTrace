import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = path.join(
  root,
  "backend",
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
if (!existsSync(python)) {
  console.error(
    "Create backend/.venv and install backend/requirements-dev.txt first. See README.md.",
  );
  process.exit(1);
}
const api = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: path.join(root, "backend"), stdio: "inherit" },
);
const ui = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "--host",
    "0.0.0.0",
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit" },
);
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  api.kill("SIGTERM");
  ui.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
}
api.on("exit", (code) => close(code || 0));
ui.on("exit", (code) => close(code || 0));
api.on("error", () => close(1));
ui.on("error", () => close(1));
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
