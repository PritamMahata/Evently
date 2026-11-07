import { scanSecrets, trackedFiles } from "./requirements";
import fs from "fs";

const res = scanSecrets();
// Debug leftovers in source (console.error in the API error handler and scripts is intentional).
const leftovers: string[] = [];
for (const f of trackedFiles().filter((f) => /^src\/.*\.(ts|tsx)$/.test(f))) {
  const t = fs.readFileSync(f, "utf8");
  if (/console\.log|debugger|TODO|FIXME/.test(t)) leftovers.push(f);
}
if (res) console.error("FAIL", res);
if (leftovers.length)
  console.error("FAIL debug leftovers in:", leftovers.join(", "));
if (!res && !leftovers.length)
  console.log(
    "✓ secret scan clean, no console.log/debugger/TODO/FIXME in src/",
  );
process.exitCode = res || leftovers.length ? 1 : 0;
