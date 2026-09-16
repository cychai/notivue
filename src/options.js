import {
  AI_PROVIDER_PRESETS,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  normalizeSettings
} from "./shared.js";

const form = document.querySelector("#settingsForm");
const apiBaseUrl = document.querySelector("#apiBaseUrl");
const apiKey = document.querySelector("#apiKey");
const model = document.querySelector("#model");
const targetLanguage = document.querySelector("#targetLanguage");
const status = document.querySelector("#status");
const toggleKeyBtn = document.querySelector("#toggleKeyBtn");
let activeProvider = "custom";
let providerApiKeys = {};

function markProvider(provider) {
  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.classList.toggle("active", button.dataset.provider === provider);
  });
}

function providerForBaseUrl(value) {
  return (
    Object.entries(AI_PROVIDER_PRESETS).find(
      ([, preset]) => preset.apiBaseUrl === value
    )?.[0] || "custom"
  );
}

async function load() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const rawSettings = stored[SETTINGS_KEY] || DEFAULT_SETTINGS;
  const settings = normalizeSettings(rawSettings);
  activeProvider = providerForBaseUrl(settings.apiBaseUrl);
  providerApiKeys = { ...(rawSettings.providerApiKeys || {}) };
  if (settings.apiKey && !providerApiKeys[activeProvider]) {
    providerApiKeys[activeProvider] = settings.apiKey;
  }
  apiBaseUrl.value = settings.apiBaseUrl;
  apiKey.value = providerApiKeys[activeProvider] || "";
  model.value = settings.model;
  targetLanguage.value = settings.targetLanguage;
  model.placeholder =
    AI_PROVIDER_PRESETS[activeProvider]?.modelPlaceholder || "输入模型名称";
  markProvider(activeProvider);
}

document.querySelectorAll("[data-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    const provider = button.dataset.provider;
    if (activeProvider !== provider) {
      providerApiKeys[activeProvider] = apiKey.value.trim();
      activeProvider = provider;
      apiKey.value = providerApiKeys[provider] || "";
      apiKey.type = "password";
      toggleKeyBtn.textContent = "显示";
    }
    const preset = AI_PROVIDER_PRESETS[button.dataset.provider];
    if (!preset) {
      markProvider("custom");
      apiBaseUrl.focus();
      return;
    }
    apiBaseUrl.value = preset.apiBaseUrl;
    model.value = preset.model;
    model.placeholder = preset.modelPlaceholder;
    markProvider(button.dataset.provider);
    if (!preset.model) model.focus();
  });
});

toggleKeyBtn.addEventListener("click", (event) => {
  const reveal = apiKey.type === "password";
  apiKey.type = reveal ? "text" : "password";
  event.currentTarget.textContent = reveal ? "隐藏" : "显示";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "正在保存…";
  activeProvider = providerForBaseUrl(apiBaseUrl.value);
  const settings = normalizeSettings({
    apiBaseUrl: apiBaseUrl.value,
    apiKey: apiKey.value,
    model: model.value,
    targetLanguage: targetLanguage.value
  });
  providerApiKeys[activeProvider] = settings.apiKey;
  try {
    const origin = `${new URL(settings.apiBaseUrl).origin}/*`;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) throw new Error("需要允许访问该 AI 服务地址。");
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        ...settings,
        providerApiKeys
      }
    });
    status.textContent = "已保存在本机";
    setTimeout(() => {
      status.textContent = "";
    }, 2400);
  } catch (error) {
    status.textContent = error.message;
  }
});

load();
