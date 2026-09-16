import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const bridgePath = new URL("../src/page-bridge.js", import.meta.url);

async function loadTranscriptHelpers(document, extras = {}) {
  const source = await readFile(bridgePath, "utf8");
  const instrumented = source.replace(
    'window.addEventListener("message", messageListener);',
    [
      "globalThis.__readTranscriptPanel = readTranscriptPanel;",
      "globalThis.__fetchFromTranscriptPanel = fetchFromTranscriptPanel;",
      'window.addEventListener("message", messageListener);'
    ].join("\n")
  );
  const context = {
    document,
    location: { href: "https://www.youtube.com/watch?v=Ck-LeYlAVbY" },
    URL,
    setTimeout,
    clearTimeout,
    ...extras
  };
  context.window = context;
  context.window.addEventListener = () => {};
  vm.runInNewContext(instrumented, context);
  return {
    readTranscriptPanel: context.__readTranscriptPanel,
    fetchFromTranscriptPanel: context.__fetchFromTranscriptPanel
  };
}

test("reads current transcript-segment-view-model rows", async () => {
  const row = {
    querySelector(selector) {
      if (selector.includes(".ytwTranscriptSegmentViewModelTimestamp")) {
        return { textContent: "0:07" };
      }
      if (selector.includes("span.ytAttributedStringHost")) {
        return { textContent: "Forward deployed engineering interview." };
      }
      return null;
    }
  };
  const document = {
    querySelectorAll(selector) {
      const selectors = selector.split(",").map((value) => value.trim());
      return selectors.includes("transcript-segment-view-model") ? [row] : [];
    }
  };
  const { readTranscriptPanel } = await loadTranscriptHelpers(document);

  const entries = JSON.parse(JSON.stringify(readTranscriptPanel()));
  assert.deepEqual(entries, [{
    start: 7,
    duration: 4,
    text: "Forward deployed engineering interview."
  }]);
});

test("waits for transcript rows when the legacy transcript button is absent", async () => {
  let rowsReady = false;
  const row = {
    querySelector(selector) {
      if (selector.includes(".ytwTranscriptSegmentViewModelTimestamp")) {
        return { textContent: "0:07" };
      }
      if (selector.includes("span.ytAttributedStringHost")) {
        return { textContent: "Delayed transcript row." };
      }
      return null;
    }
  };
  const document = {
    documentElement: {},
    querySelectorAll(selector) {
      const selectors = selector.split(",").map((value) => value.trim());
      return rowsReady && selectors.includes("transcript-segment-view-model") ? [row] : [];
    },
    querySelector() {
      return null;
    }
  };
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      rowsReady = true;
      queueMicrotask(this.callback);
    }

    disconnect() {}
  }
  const { fetchFromTranscriptPanel } = await loadTranscriptHelpers(document, {
    MutationObserver: FakeMutationObserver
  });

  const entries = JSON.parse(JSON.stringify(await fetchFromTranscriptPanel()));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].text, "Delayed transcript row.");
});
