import { cp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const standalone = join(frontend, ".next", "standalone", "frontend");
const portIndex = process.argv.indexOf("--port");
const port = Number(
  portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000,
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid port");
await cp(join(frontend, "public"), join(standalone, "public"), {
  recursive: true,
});
await cp(
  join(frontend, ".next", "static"),
  join(standalone, ".next", "static"),
  { recursive: true },
);
const server = spawn(process.execPath, [join(standalone, "server.js")], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port), HOSTNAME: "0.0.0.0" },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.on("exit", (code) => process.exit(code ?? 1));
