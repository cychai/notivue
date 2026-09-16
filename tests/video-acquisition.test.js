import test from "node:test";
import assert from "node:assert/strict";
import { acquireYouTubeVideo } from "../src/video-acquisition.js";

const youtubeTab = {
  id: 42,
  url: "https://www.youtube.com/watch?v=video-123"
};

test("reinjects the content bridge when the message receiver is missing", async () => {
  let sendCount = 0;
  const injections = [];
  const result = await acquireYouTubeVideo({
    requestedTabId: youtubeTab.id,
    tabs: {
      get: async () => youtubeTab,
      query: async () => [youtubeTab],
      sendMessage: async () => {
        sendCount += 1;
        if (sendCount === 1) throw new Error("Could not establish connection. Receiving end does not exist.");
        return { ok: true, result: { videoId: "video-123" } };
      }
    },
    scripting: {
      executeScript: async (details) => injections.push(details)
    },
    sleep: async () => {}
  });

  assert.equal(result.video.videoId, "video-123");
  assert.equal(result.tabId, youtubeTab.id);
  assert.deepEqual(injections, [{
    target: { tabId: youtubeTab.id },
    files: ["src/content.js"]
  }]);
});

test("waits and retries when the page bridge responds before video data is ready", async () => {
  let sendCount = 0;
  let sleepCount = 0;
  const result = await acquireYouTubeVideo({
    requestedTabId: youtubeTab.id,
    tabs: {
      get: async () => youtubeTab,
      query: async () => [youtubeTab],
      sendMessage: async () => {
        sendCount += 1;
        return {
          ok: true,
          result: sendCount < 3 ? { videoId: "" } : { videoId: "video-123" }
        };
      }
    },
    scripting: { executeScript: async () => {} },
    sleep: async () => {
      sleepCount += 1;
    }
  });

  assert.equal(result.video.videoId, "video-123");
  assert.equal(sendCount, 3);
  assert.equal(sleepCount, 2);
});

test("falls back to the active YouTube tab when the requested tab is stale", async () => {
  const result = await acquireYouTubeVideo({
    requestedTabId: 99,
    tabs: {
      get: async () => {
        throw new Error("No tab with id: 99");
      },
      query: async () => [youtubeTab],
      sendMessage: async () => ({ ok: true, result: { videoId: "video-123" } })
    },
    scripting: { executeScript: async () => {} },
    sleep: async () => {}
  });

  assert.equal(result.tabId, youtubeTab.id);
});

test("preserves the final page error after bounded retries", async () => {
  let sendCount = 0;
  await assert.rejects(
    acquireYouTubeVideo({
      requestedTabId: youtubeTab.id,
      attempts: 3,
      tabs: {
        get: async () => youtubeTab,
        query: async () => [youtubeTab],
        sendMessage: async () => {
          sendCount += 1;
          return { ok: false, error: "页面响应超时，请刷新视频页后重试。" };
        }
      },
      scripting: { executeScript: async () => {} },
      sleep: async () => {}
    }),
    /页面响应超时/
  );
  assert.equal(sendCount, 3);
});
