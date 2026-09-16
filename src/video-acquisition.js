const DEFAULT_DELAYS = [200, 400, 700, 1000, 1400];

function isYouTubeWatchTab(tab) {
  if (!tab?.id || !tab.url) return false;
  try {
    const url = new URL(tab.url);
    return (
      (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") &&
      url.pathname === "/watch" &&
      Boolean(url.searchParams.get("v"))
    );
  } catch {
    return false;
  }
}

async function resolveYouTubeTab(tabs, requestedTabId) {
  if (Number.isInteger(requestedTabId) && requestedTabId > 0) {
    const requested = await tabs.get(requestedTabId).catch(() => null);
    if (isYouTubeWatchTab(requested)) return requested;
  }
  const [active] = await tabs.query({ active: true, currentWindow: true });
  return isYouTubeWatchTab(active) ? active : null;
}

async function injectContentScript(scripting, tabId) {
  if (!scripting?.executeScript) return;
  await scripting.executeScript({
    target: { tabId },
    files: ["src/content.js"]
  });
}

export async function acquireYouTubeVideo({
  tabs,
  scripting,
  requestedTabId,
  attempts = 6,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
}) {
  let tabId = requestedTabId;
  let lastError = null;
  const injectedTabs = new Set();

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const tab = await resolveYouTubeTab(tabs, tabId);
    if (!tab) {
      const error = new Error("打开一个带字幕的 YouTube 视频，Notivue 会在这里整理逐字稿。");
      error.code = "NO_YOUTUBE_TAB";
      throw error;
    }
    tabId = tab.id;

    try {
      const response = await tabs.sendMessage(tabId, { action: "site:getVideo" });
      if (!response?.ok) throw new Error(response?.error || "视频页面没有响应。");
      if (response.result?.videoId) {
        return { tabId, video: response.result };
      }
      lastError = new Error("视频页面仍在加载，请稍候重试。");
    } catch (error) {
      lastError = error;
      if (!injectedTabs.has(tabId)) {
        try {
          await injectContentScript(scripting, tabId);
          injectedTabs.add(tabId);
        } catch {
          // Retrying the existing receiver can still recover during navigation.
        }
      }
    }

    if (attempt < attempts - 1) {
      await sleep(DEFAULT_DELAYS[Math.min(attempt, DEFAULT_DELAYS.length - 1)]);
    }
  }

  throw new Error(
    `${lastError?.message || "尚未识别到视频。"} Notivue 已自动重试，请刷新视频页后再试。`
  );
}
