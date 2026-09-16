((channel) => {
const bridgeKey = "__cuemindContentBridge";

function injectPageBridge() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/page-bridge.js");
  script.dataset.channel = channel;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

if (window[bridgeKey]?.channel === channel) {
  injectPageBridge();
  return;
}
const pending = new Map();

injectPageBridge();

const messageListener = (event) => {
  const data = event.data;
  if (event.source !== window || data?.channel !== channel || data?.direction !== "response") return;
  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  clearTimeout(request.timeout);
  if (data.error) request.reject(new Error(data.error));
  else request.resolve(data.result);
};

window.addEventListener("message", messageListener);
window[bridgeKey] = { channel, listener: messageListener };

function requestPage(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("页面响应超时，请刷新视频页后重试。"));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    window.postMessage({ channel, direction: "request", id, action, payload }, "*");
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const routes = {
    "site:getVideo": () => requestPage("getVideo"),
    "site:getTranscript": () =>
      requestPage("getTranscript", {
        baseUrl: message.baseUrl,
        videoId: message.videoId,
        languageCode: message.languageCode
      }),
    "site:seek": () => requestPage("seek", { seconds: message.seconds }),
    "site:getTime": () => requestPage("getTime")
  };
  const route = routes[message.action];
  if (!route) return false;
  route()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
})(`notivue-page-bridge-${chrome.runtime.getManifest().version}`);
