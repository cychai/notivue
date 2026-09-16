import test from "node:test";
import assert from "node:assert/strict";

class FakeElement {
  constructor({ provider, type = "text" } = {}) {
    this.value = "";
    this.type = type;
    this.placeholder = "";
    this.textContent = "";
    this.dataset = provider ? { provider } : {};
    this.listeners = new Map();
    this.classList = { toggle() {} };
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.({ currentTarget: this });
  }

  async submit() {
    await this.listeners.get("submit")?.({ preventDefault() {} });
  }

  focus() {}
}

test("preserves a separate API key for each provider", async () => {
  let savedSettings;
  const originalSetTimeout = globalThis.setTimeout;
  const elements = {
    "#settingsForm": new FakeElement(),
    "#apiBaseUrl": new FakeElement(),
    "#apiKey": new FakeElement({ type: "password" }),
    "#model": new FakeElement(),
    "#targetLanguage": new FakeElement(),
    "#status": new FakeElement(),
    "#toggleKeyBtn": new FakeElement()
  };
  const providers = ["deepseek", "openai", "custom"].map(
    (provider) => new FakeElement({ provider })
  );

  globalThis.document = {
    querySelector(selector) {
      return elements[selector];
    },
    querySelectorAll(selector) {
      return selector === "[data-provider]" ? providers : [];
    }
  };
  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          return {
            cuemind_settings: {
              apiBaseUrl: "https://api.deepseek.com",
              apiKey: "deepseek-key",
              model: "deepseek-chat",
              targetLanguage: "简体中文",
              providerApiKeys: {
                deepseek: "deepseek-key",
                openai: "openai-key"
              }
            }
          };
        },
        async set(value) {
          savedSettings = value.cuemind_settings;
        }
      }
    },
    permissions: {
      async request() {
        return true;
      }
    }
  };

  try {
    globalThis.setTimeout = (callback) => {
      callback();
      return 0;
    };
    await import(`../src/options.js?test=${Date.now()}`);
    await Promise.resolve();
    assert.equal(elements["#apiKey"].value, "deepseek-key");

    providers.find(({ dataset }) => dataset.provider === "deepseek").click();
    assert.equal(elements["#apiKey"].value, "deepseek-key");

    providers.find(({ dataset }) => dataset.provider === "openai").click();
    assert.equal(elements["#apiKey"].value, "openai-key");
    elements["#apiKey"].value = "updated-openai-key";

    providers.find(({ dataset }) => dataset.provider === "deepseek").click();
    assert.equal(elements["#apiKey"].value, "deepseek-key");

    providers.find(({ dataset }) => dataset.provider === "openai").click();
    assert.equal(elements["#apiKey"].value, "updated-openai-key");

    await elements["#settingsForm"].submit();
    assert.deepEqual(savedSettings.providerApiKeys, {
      deepseek: "deepseek-key",
      openai: "updated-openai-key"
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    delete globalThis.document;
    delete globalThis.chrome;
  }
});
