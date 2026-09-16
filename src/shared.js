export const SETTINGS_KEY = "cuemind_settings";
export const NOTES_KEY = "cuemind_notes";
export const CACHE_PREFIX = "cuemind_video_";

export const AI_PROVIDER_PRESETS = Object.freeze({
  deepseek: {
    apiBaseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    modelPlaceholder: "deepseek-chat"
  },
  openai: {
    apiBaseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    modelPlaceholder: "gpt-4.1-mini"
  },
  doubao: {
    apiBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "",
    modelPlaceholder: "填写火山方舟推理接入点 ID"
  },
  glm: {
    apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.5-flash",
    modelPlaceholder: "glm-4.5-flash"
  },
  kimi: {
    apiBaseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k2.5",
    modelPlaceholder: "kimi-k2.5"
  },
  minimax: {
    apiBaseUrl: "https://api.minimaxi.com/v1",
    model: "MiniMax-M2.1",
    modelPlaceholder: "MiniMax-M2.1"
  }
});

export const DEFAULT_SETTINGS = Object.freeze({
  apiBaseUrl: AI_PROVIDER_PRESETS.deepseek.apiBaseUrl,
  apiKey: "",
  model: AI_PROVIDER_PRESETS.deepseek.model,
  targetLanguage: "简体中文"
});

export function normalizeSettings(input = {}) {
  const base = String(input.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl)
    .trim()
    .replace(/\/+$/, "");
  return {
    apiBaseUrl: /^https:\/\/[^/]+/i.test(base) ? base : DEFAULT_SETTINGS.apiBaseUrl,
    apiKey: String(input.apiKey || "").trim(),
    model: String(input.model || DEFAULT_SETTINGS.model).trim(),
    targetLanguage: String(input.targetLanguage || DEFAULT_SETTINGS.targetLanguage).trim()
  };
}

export function chatCompletionsUrl(baseUrl) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function parseJsonResponse(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = Math.min(
      ...["{", "["]
        .map((token) => candidate.indexOf(token))
        .filter((index) => index >= 0)
    );
    const last = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (Number.isFinite(first) && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error("AI 返回内容不是有效 JSON，请重试。");
  }
}

export function groupTranscript(entries, options = {}) {
  const idealChars = options.idealChars || 150;
  const maxSeconds = options.maxSeconds || 18;
  const grouped = [];
  let current = null;

  for (const entry of entries || []) {
    const text = String(entry.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const start = Math.max(0, Number(entry.start) || 0);
    if (!current) current = { start, duration: 0, text: "" };
    current.text = `${current.text} ${text}`.trim();
    current.duration = Math.max(0, start - current.start) + (Number(entry.duration) || 0);
    const naturalEnd = /[.!?。！？]["')\]”’]*$/.test(text);
    if (
      (naturalEnd && current.text.length >= idealChars * 0.45) ||
      current.text.length >= idealChars ||
      current.duration >= maxSeconds
    ) {
      grouped.push({ ...current, id: `cue-${grouped.length}-${Math.round(current.start * 1000)}` });
      current = null;
    }
  }

  if (current) {
    grouped.push({ ...current, id: `cue-${grouped.length}-${Math.round(current.start * 1000)}` });
  }
  return grouped;
}

export function transcriptForPrompt(entries, maxChars = 60000) {
  let output = "";
  for (const item of entries || []) {
    const line = `[${formatTime(item.start)}] ${item.text}\n`;
    if (output.length + line.length > maxChars) break;
    output += line;
  }
  return output.trim();
}

export function escapeMarkdown(text) {
  return String(text || "").replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}
