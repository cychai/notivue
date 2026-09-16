import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridgePath = new URL("../src/page-bridge.js", import.meta.url);
const contentPath = new URL("../src/content.js", import.meta.url);

test("page bridge and content script avoid CHANNEL lexical redeclarations", async () => {
  const [bridge, content] = await Promise.all([
    readFile(bridgePath, "utf8"),
    readFile(contentPath, "utf8")
  ]);

  assert.doesNotMatch(bridge, /\b(?:const|let|class)\s+CHANNEL\b/);
  assert.doesNotMatch(content, /\b(?:const|let|class)\s+CHANNEL\b/);
  assert.match(bridge, /__cuemindPageBridge/);
  assert.match(content, /chrome\.runtime\.getManifest\(\)\.version/);
  assert.match(content, /script\.dataset\.channel\s*=\s*channel/);
  assert.match(bridge, /document\.currentScript\?\.dataset\.channel/);
});
