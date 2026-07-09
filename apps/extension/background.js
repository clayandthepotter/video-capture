// Service worker — orchestration only, following Cap's architecture:
// the offscreen document owns capture/recording and is the source of truth;
// the SW relays commands, tracks a status state machine mirrored to
// chrome.storage.session, and broadcasts changes to every surface (popup +
// the recording bar in all tabs). MV3 SWs die at will, so anything here can
// be rebuilt from storage + the offscreen document at any time.

const API_BASES = ["http://localhost:3000", "https://capca-cam.vercel.app"];
const STATUS_KEY = "capca:status";

// status: { phase: "idle"|"creating"|"recording"|"paused"|"uploading"|"error",
//           startedAt?, pausedMs?, error?, shareUrl? }

async function getStatus() {
  const store = await chrome.storage.session.get(STATUS_KEY);
  return store[STATUS_KEY] ?? { phase: "idle" };
}

async function setStatus(status) {
  await chrome.storage.session.set({ [STATUS_KEY]: status });
  chrome.runtime.sendMessage({ type: "vc:status", status }).catch(() => {});
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: "vc:status", status }).catch(() => {});
    }
  }
  const badge =
    status.phase === "recording" ? "REC" : status.phase === "paused" ? "II" : "";
  chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }).catch(() => {});
  chrome.action.setBadgeText({ text: badge }).catch(() => {});
}

async function hasOffscreen() {
  return (await chrome.offscreen.hasDocument?.()) ?? false;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
    justification: "Record the selected screen, tab, or camera with MediaRecorder",
  });
}

/** On SW restart the in-memory state is gone — resync from ground truth. */
async function syncStatus() {
  const status = await getStatus();
  if (!(await hasOffscreen())) {
    if (status.phase !== "idle" && status.phase !== "error") {
      await setStatus({ phase: "idle" });
      return { phase: "idle" };
    }
    return status;
  }
  try {
    const real = await chrome.runtime.sendMessage({ type: "vc:offscreen-get-status" });
    if (real?.status && real.status.phase !== status.phase) {
      await setStatus(real.status);
      return real.status;
    }
  } catch {}
  return status;
}

async function showControls(tabId, status) {
  if (tabId == null) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "vc:show-controls", status });
  } catch {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["content.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tabId, { type: "vc:show-controls", status });
    } catch {}
  }
}

async function startRecording({
  mode = "fullscreen",
  withMic = true,
  withCamera = true,
} = {}) {
  await setStatus({ phase: "creating", mode, withMic, withCamera });

  let tabStreamId;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await showControls(activeTab?.id, { phase: "creating", mode, withMic, withCamera });
  if (mode === "tab") {
    if (activeTab?.id == null) {
      await setStatus({ phase: "error", error: "No active tab to record" });
      return;
    }
    tabStreamId = await new Promise((resolve) =>
      chrome.tabCapture.getMediaStreamId({ targetTabId: activeTab.id }, (id) =>
        resolve(id),
      ),
    );
    if (!tabStreamId) {
      await setStatus({ phase: "error", error: "Tab capture was not granted" });
      return;
    }
  }

  await ensureOffscreen();
  chrome.runtime.sendMessage({
    type: "vc:offscreen-start",
    mode,
    withMic,
    tabStreamId,
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    // ---- commands from popup / recording bar ----
    case "vc:start-recording":
      void startRecording(msg);
      sendResponse({ ok: true });
      break;
    case "vc:stop-recording":
    case "vc:pause-recording":
    case "vc:resume-recording":
    case "vc:set-mic":
      chrome.runtime
        .sendMessage({ ...msg, type: msg.type.replace("vc:", "vc:offscreen-") })
        .catch(() => {});
      sendResponse({ ok: true });
      break;
    case "vc:get-status":
      void syncStatus().then((status) => sendResponse({ status }));
      return true; // async response

    // ---- events from the offscreen recorder ----
    case "vc:recording-started":
      void setStatus({ phase: "recording", startedAt: Date.now() });
      break;
    case "vc:recording-paused":
      void getStatus().then((s) => setStatus({ ...s, phase: "paused" }));
      break;
    case "vc:recording-resumed":
      void getStatus().then((s) => setStatus({ ...s, phase: "recording" }));
      break;
    case "vc:recording-cancelled":
      void setStatus({ phase: "idle" });
      break;
    case "vc:recording-error":
      void setStatus({ phase: "error", error: msg.error });
      break;
    case "vc:recording-complete":
      void handleRecordingComplete(msg);
      break;
  }
});

/** Upload to the Capca API (browser session cookie), fall back to download. */
async function handleRecordingComplete({ blobUrl, mimeType, durationSec }) {
  await setStatus({ phase: "uploading" });
  try {
    const blob = await fetch(blobUrl).then((r) => r.blob());
    const ext = (mimeType || "").includes("mp4") ? "mp4" : "webm";

    for (const base of API_BASES) {
      try {
        const create = await fetch(`${base}/api/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: `Recording ${new Date().toLocaleString()}`,
            mimeType: mimeType || "video/webm",
          }),
        });
        if (!create.ok) continue;

        const { id, uploadUrl, shareUrl } = await create.json();
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": mimeType || "video/webm" },
          body: blob,
        });
        if (!put.ok) throw new Error(`upload failed: ${put.status}`);

        await fetch(`${base}/api/recordings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sizeBytes: blob.size, durationSec }),
        });

        const absolute = `${base}${shareUrl}`;
        await setStatus({ phase: "idle", shareUrl: absolute });
        chrome.tabs.create({ url: absolute });
        await teardownOffscreen();
        return;
      } catch (err) {
        console.warn("[capca] upload attempt failed for", base, err);
      }
    }

    // No session anywhere — keep the recording locally.
    await chrome.downloads.download({
      url: blobUrl,
      filename: `capca-recording-${Date.now()}.${ext}`,
      saveAs: true,
    });
    await setStatus({ phase: "idle", savedLocally: true });
    await teardownOffscreen();
  } catch (err) {
    await setStatus({ phase: "error", error: `upload: ${err.message}` });
  }
}

async function teardownOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

// Ground-truth resync whenever the SW wakes up.
void syncStatus();
