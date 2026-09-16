import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const required = [
  manifest.background.service_worker,
  manifest.side_panel.default_path,
  manifest.options_ui.page,
  ...Object.values(manifest.icons || {}),
  ...manifest.content_scripts.flatMap((entry) => entry.js),
  ...manifest.web_accessible_resources.flatMap((entry) => entry.resources)
];

await Promise.all(required.map((file) => access(file)));

const scripts = [
  "src/background.js",
  "src/content.js",
  "src/page-bridge.js",
  "src/shared.js",
  "src/video-acquisition.js",
  "src/sidepanel.js",
  "src/options.js"
];

for (const file of scripts) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Checked manifest and ${scripts.length} JavaScript files.`);
