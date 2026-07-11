// Service worker — orchestration only, following Cap's architecture:
// the offscreen document owns capture/recording and is the source of truth;
// the SW relays commands, tracks a status state machine mirrored to
// chrome.storage.session, and broadcasts changes to every surface (popup +
// the recording bar in all tabs). MV3 SWs die at will, so anything here can
// be rebuilt from storage + the offscreen document at any time.

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
    // Tab predates the extension install — inject the content script (styles
    // load inside its shadow root) and retry.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tabId, { type: "vc:show-controls", status });
    } catch {}
  }
}

async function startRecording({
  withMic = true,
  withCamera = true,
} = {}) {
  await setStatus({ phase: "creating", withMic, withCamera });

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await showControls(activeTab?.id, { phase: "creating", withMic, withCamera });

  await ensureOffscreen();
  chrome.runtime.sendMessage({
    type: "vc:offscreen-start",
    withMic,
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
      void maybeTeardown(msg);
      break;
    case "vc:recording-error":
      void setStatus({ phase: "error", error: msg.error });
      void maybeTeardown(msg);
      break;
    // Uploads are decoupled from the recorder: a new recording may already be
    // running while a previous one finalizes, so never clobber an active
    // recording's status with upload progress.
    case "vc:upload-finalizing":
      void getStatus().then((s) => {
        if (!isRecordingPhase(s.phase)) {
          void setStatus({ phase: "uploading" });
        }
      });
      break;
    case "vc:upload-finalized":
      chrome.tabs.create({ url: msg.shareUrl });
      void getStatus().then((s) => {
        if (!isRecordingPhase(s.phase)) {
          void setStatus({ phase: "idle", shareUrl: msg.shareUrl });
        }
      });
      void maybeTeardown(msg);
      break;
    case "vc:recording-complete":
      void handleRecordingComplete(msg);
      break;
  }
});

function isRecordingPhase(phase) {
  return phase === "creating" || phase === "recording" || phase === "paused";
}

/** Close the offscreen document only when it has nothing left to do. */
async function maybeTeardown(msg) {
  if (msg && (msg.recording || msg.uploads > 0)) return;
  const status = await getStatus();
  if (isRecordingPhase(status.phase)) return;
  await teardownOffscreen();
}

/**
 * Fallback path: the offscreen uploader couldn't stream (signed out, offline,
 * or a mid-recording failure with the local copy intact) — save the file
 * locally instead. Streaming uploads happen in the offscreen document.
 */
async function handleRecordingComplete(msg) {
  const { blobUrl, mimeType } = msg;
  try {
    const ext = (mimeType || "").includes("mp4") ? "mp4" : "webm";
    await chrome.downloads.download({
      url: blobUrl,
      filename: `capca-recording-${Date.now()}.${ext}`,
      saveAs: true,
    });
    const status = await getStatus();
    if (!isRecordingPhase(status.phase)) {
      await setStatus({ phase: "idle", savedLocally: true });
    }
    await maybeTeardown(msg);
  } catch (err) {
    await setStatus({ phase: "error", error: `save: ${err.message}` });
  }
}

async function teardownOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

// Ground-truth resync whenever the SW wakes up.
void syncStatus();
