import test from "node:test";
import assert from "node:assert/strict";

function chromeWithoutModernApis() {
  const listeners = {};
  return {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {}
      }
    },
    runtime: {
      onInstalled: { addListener: (listener) => (listeners.installed = listener) },
      onMessage: { addListener: (listener) => (listeners.message = listener) },
      getURL: (path) => `chrome-extension://test/${path}`,
      openOptionsPage: () => {}
    },
    action: {
      onClicked: { addListener: (listener) => (listeners.action = listener) }
    },
    tabs: {
      create: async (options) => {
        listeners.createdTab = options;
      }
    },
    permissions: {
      contains: async () => true
    },
    __listeners: listeners
  };
}

test("background starts when storage access level and side panel APIs are unavailable", async () => {
  globalThis.chrome = chromeWithoutModernApis();

  await import(`../src/background.js?compat=${Date.now()}`);
  assert.equal(typeof chrome.__listeners.action, "function");

  chrome.__listeners.action({ id: 42 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    chrome.__listeners.createdTab.url,
    "chrome-extension://test/sidepanel.html?tabId=42"
  );
});
