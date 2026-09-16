import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  chatCompletionsUrl,
  normalizeSettings,
  parseJsonResponse
} from "./shared.js";

if (typeof chrome.storage.local.setAccessLevel === "function") {
  chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
}

const hasSidePanel =
  typeof chrome.sidePanel?.setOptions === "function" &&
  typeof chrome.sidePanel?.open === "function";

if (typeof chrome.sidePanel?.setPanelBehavior === "function") {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  if (!stored[SETTINGS_KEY]) await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  if (reason === "install") chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  if (hasSidePanel) {
    chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true });
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    return;
  }
  chrome.tabs.create({
    url: chrome.runtime.getURL(`sidepanel.html?tabId=${tab.id}`)
  });
});

async function settings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

async function requestAi({ system, user, maxTokens = 3000, temperature = 0.2 }) {
  const config = await settings();
  if (!config.apiKey) {
    const error = new Error("请先在设置中填写 AI API Key。");
    error.code = "NO_API_KEY";
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" }
  };
  const send = () =>
    fetch(chatCompletionsUrl(config.apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  try {
    let response = await send();
    let responseBody = await response.json().catch(() => ({}));
    if (!response.ok && response.status === 400 && /response.?format/i.test(JSON.stringify(responseBody))) {
      delete body.response_format;
      response = await send();
      responseBody = await response.json().catch(() => ({}));
    }
    if (!response.ok) {
      throw new Error(responseBody.error?.message || `AI 请求失败 (${response.status})`);
    }
    const text = responseBody.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI 未返回内容。");
    return parseJsonResponse(text);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI 请求超时，请重试。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function analyze(message) {
  return requestAi({
    system:
      "你是严谨的视频学习编辑。只返回 JSON。章节时间必须来自逐字稿已有时间戳，不得编造。输出中文。",
    user: `分析以下视频逐字稿。
标题：${message.title}
作者：${message.author}

返回：
{"summary":"150字以内概览","chapters":[{"start":秒数,"title":"章节名","summary":"1-2句"}],"quotes":[{"start":秒数,"text":"保留原文金句","insight":"中文说明"}]}
章节控制在 3-8 个，金句控制在 3-6 个。

逐字稿：
${message.transcript}`,
    maxTokens: 4000
  });
}

async function translate(message) {
  return requestAi({
    system:
      "你是专业字幕译者。忠实、简洁、自然，保留术语含义。只返回 JSON，不增删条目。",
    user: `将下列字幕翻译成${message.targetLanguage || "简体中文"}。
返回 {"translations":[{"id":"原 id","text":"译文"}]}。

${JSON.stringify(message.items)}`,
    maxTokens: 5000,
    temperature: 0.1
  });
}

async function explain(message) {
  return requestAi({
    system: "你是善于用通俗中文讲清专业概念的导师。只返回 JSON。",
    user: `解释视频中的选中文字。
视频：${message.title}
选中：${message.selection}
上下文：${message.context}

返回 {"term":"术语或短语","plain":"一句话解释","detail":"结合上下文的解释","example":"一个简短例子或类比"}。`,
    maxTokens: 1200
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers = {
    "ai:analyze": () => analyze(message),
    "ai:translate": () => translate(message),
    "ai:explain": () => explain(message),
    "settings:get": () => settings(),
    "settings:open": () => {
      chrome.runtime.openOptionsPage();
      return { ok: true };
    }
  };
  const handler = handlers[message.action];
  if (!handler) return false;
  Promise.resolve()
    .then(handler)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message, code: error.code }));
  return true;
});
