import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const serverToken = process.env.FINARA_E2E_SERVER_TOKEN;
if (!serverToken) {
  throw new Error("FINARA_E2E_SERVER_TOKEN is required.");
}

const nextCli = resolve(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const server = spawn(process.execPath, [nextCli, "start"], {
  env: process.env,
  stdio: "inherit",
});
const processFile = resolve(process.cwd(), ".next", "e2e-server-processes.json");
writeFileSync(
  processFile,
  JSON.stringify({
    marker: "finara-e2e-server-v1",
    serverPid: server.pid,
    token: serverToken,
    wrapperPid: process.pid,
  }),
);
let shutdownRequested = false;

function stopServer() {
  if (shutdownRequested) return;
  shutdownRequested = true;

  if (server.pid && server.exitCode === null && server.signalCode === null) {
    try {
      process.kill(server.pid, "SIGKILL");
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ESRCH") {
        throw error;
      }
    }
  }

  setTimeout(() => process.exit(0), 1_000);
}

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);

server.once("error", (error) => {
  console.error("Unable to start the E2E application server.", error);
  process.exit(1);
});

server.once("exit", (code) => {
  process.exit(shutdownRequested ? 0 : (code ?? 1));
});
