import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_PROVIDER_PRESETS,
  chatCompletionsUrl,
  formatTime,
  groupTranscript,
  normalizeSettings,
  parseJsonResponse,
  transcriptForPrompt
} from "../src/shared.js";

test("formats timestamps for short and long videos", () => {
  assert.equal(formatTime(65.8), "1:05");
  assert.equal(formatTime(3661), "1:01:01");
  assert.equal(formatTime(-2), "0:00");
});

test("groups caption fragments into readable cues", () => {
  const grouped = groupTranscript(
    [
      { start: 0, duration: 1, text: "Machine learning" },
      { start: 1, duration: 1, text: "helps computers learn." },
      { start: 4, duration: 1, text: "This is a second thought." }
    ],
    { idealChars: 30 }
  );
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].text, "Machine learning helps computers learn.");
  assert.equal(grouped[1].start, 4);
});

test("normalizes provider settings", () => {
  assert.deepEqual(normalizeSettings({
    apiBaseUrl: "https://example.com/v1/",
    apiKey: " key ",
    model: " model "
  }), {
    apiBaseUrl: "https://example.com/v1",
    apiKey: "key",
    model: "model",
    targetLanguage: "简体中文"
  });
  assert.equal(chatCompletionsUrl("https://example.com/v1/"), "https://example.com/v1/chat/completions");
  assert.equal(
    chatCompletionsUrl("https://example.com/v1/chat/completions"),
    "https://example.com/v1/chat/completions"
  );
});

test("defines supported AI provider presets", () => {
  assert.equal(
    AI_PROVIDER_PRESETS.doubao.apiBaseUrl,
    "https://ark.cn-beijing.volces.com/api/v3"
  );
  assert.equal(AI_PROVIDER_PRESETS.doubao.model, "");
  assert.equal(
    chatCompletionsUrl(AI_PROVIDER_PRESETS.glm.apiBaseUrl),
    "https://open.bigmodel.cn/api/paas/v4/chat/completions"
  );
  assert.equal(AI_PROVIDER_PRESETS.kimi.model, "kimi-k2.5");
  assert.equal(AI_PROVIDER_PRESETS.minimax.model, "MiniMax-M2.1");
});

test("parses fenced JSON responses", () => {
  assert.deepEqual(parseJsonResponse("```json\n{\"ok\":true}\n```"), { ok: true });
});

test("bounds transcript prompt size", () => {
  const prompt = transcriptForPrompt([
    { start: 0, text: "alpha" },
    { start: 10, text: "beta" }
  ], 20);
  assert.equal(prompt, "[0:00] alpha");
});
