import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

type ServerProcesses = {
  marker: "finara-e2e-server-v1";
  serverPid: number;
  token: string;
  wrapperPid: number;
};

function isErrorCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

function terminate(pid: number) {
  if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) {
    throw new Error(`Refusing to terminate invalid E2E process ${pid}.`);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (!isErrorCode(error, "ESRCH")) throw error;
  }
}

export default async function globalTeardown() {
  const processFile = resolve(
    process.cwd(),
    ".next",
    "e2e-server-processes.json",
  );
  const serverToken = process.env.FINARA_E2E_SERVER_TOKEN;
  const processes = JSON.parse(
    await readFile(processFile, "utf8"),
  ) as ServerProcesses;

  if (
    !serverToken ||
    processes.marker !== "finara-e2e-server-v1" ||
    processes.token !== serverToken
  ) {
    throw new Error("Refusing to terminate an unverified E2E server process.");
  }

  try {
    terminate(processes.serverPid);
    terminate(processes.wrapperPid);
  } finally {
    try {
      await unlink(processFile);
    } catch (error) {
      if (!isErrorCode(error, "ENOENT")) throw error;
    }
  }
}
