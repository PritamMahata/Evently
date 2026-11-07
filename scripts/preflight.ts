import "dotenv/config";
import { spawn, spawnSync } from "child_process";
import fs from "fs";

const PORT = 3100;
type Step = { name: string; ok: boolean; note?: string };
const steps: Step[] = [];

function run(
  name: string,
  cmd: string,
  args: string[],
  env: Record<string, string> = {},
): boolean {
  console.log(`\n▶ ${name}\n  $ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
  });
  const ok = r.status === 0;
  steps.push({ name, ok });
  return ok;
}

function killProcess(proc: ReturnType<typeof spawn>) {
  if (process.platform === "win32" && proc.pid) {
    spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    });
  } else {
    proc.kill("SIGTERM");
  }
}

async function waitForServer(url: string, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function validateEnv(): Step {
  const required = ["DATABASE_URL", "AUTH_SECRET", "APP_TIMEZONE"];
  const example = fs.readFileSync(".env.example", "utf8");
  const missingExample = required.filter((k) => !example.includes(`${k}=`));
  const missingLocal = required.filter((k) => !process.env[k]);
  const weak =
    process.env.NODE_ENV === "production" &&
    (process.env.AUTH_SECRET ?? "").length < 24;
  const problems = [
    ...missingExample.map((k) => `${k} missing from .env.example`),
    ...missingLocal.map((k) => `${k} not set in environment`),
    ...(weak ? ["AUTH_SECRET too short"] : []),
  ];
  console.log(
    problems.length
      ? `✗ ${problems.join("\n✗ ")}`
      : "✓ required environment variables are documented and set",
  );
  return { name: "Environment variable validation", ok: !problems.length };
}

async function main() {
  const t = Date.now();
  run("ESLint", "npx", ["eslint", "."]);
  run("TypeScript", "npx", ["tsc", "--noEmit"]);
  run("Database migrate + seed", "npx", ["tsx", "scripts/seed.ts"]);
  run("Unit/integration tests (real Postgres)", "npm", ["test", "--silent"]);
  const built = run("Production build", "npm", ["run", "build", "--silent"]);

  if (built) {
    console.log(`\n▶ HTTP end-to-end tests (production server on :${PORT})`);
    const nextBin =
      process.platform === "win32"
        ? "node_modules\\.bin\\next.cmd"
        : "node_modules/.bin/next";
    const server = spawn(nextBin, ["start", "-p", String(PORT)], {
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
      shell: process.platform === "win32",
    });
    const up = await waitForServer(`http://localhost:${PORT}/`);
    if (!up)
      steps.push({
        name: "HTTP end-to-end tests",
        ok: false,
        note: "server did not start",
      });
    else
      run("HTTP end-to-end tests", "npx", ["tsx", "scripts/api-e2e.ts"], {
        BASE_URL: `http://localhost:${PORT}`,
      });
    killProcess(server);
  } else
    steps.push({
      name: "HTTP end-to-end tests",
      ok: false,
      note: "skipped: build failed",
    });

  steps.push(validateEnv());
  run("Secret scan + debug leftovers", "npx", [
    "tsx",
    "scripts/secret-scan.ts",
  ]);
  run("Requirement verification (+ docs/REQUIREMENTS.md)", "npx", [
    "tsx",
    "scripts/verify-requirements.ts",
    "--write-matrix",
  ]);

  console.log(
    "\n========================================\nPREFLIGHT SUMMARY\n========================================",
  );
  for (const s of steps)
    console.log(
      `${s.ok ? "✓ PASS" : "✗ FAIL"}  ${s.name}${s.note ? ` (${s.note})` : ""}`,
    );
  const bad = steps.filter((s) => !s.ok);
  console.log(
    `\n${bad.length ? `PREFLIGHT FAILED (${bad.length} step(s))` : "PREFLIGHT PASSED"} in ${Math.round((Date.now() - t) / 1000)}s`,
  );
  console.log(
    "Reminder — MANUAL: production deployment, demo video, submission form.\n========================================",
  );
  process.exit(bad.length ? 1 : 0);
}
main();
