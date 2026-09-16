import { mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const output = `dist/notivue-v${version}.zip`;
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const files = [
  "manifest.json",
  "sidepanel.html",
  "options.html",
  "README.md",
  "LICENSE",
  "assets/icons",
  "src"
];

const result = spawnSync("zip", ["-qr", output, ...files], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Created ${output}`);
