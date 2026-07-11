const el = {
  status: document.getElementById("status"),
  mic: document.getElementById("mic"),
  camera: document.getElementById("camera"),
  keepLocal: document.getElementById("keep-local"),
  primary: document.getElementById("primary"),
  controls: document.getElementById("open-controls"),
  message: document.getElementById("message"),
};

const SETTINGS_KEY = "capca:settings";

void chrome.storage.local.get(SETTINGS_KEY).then((store) => {
  el.keepLocal.checked = Boolean(store[SETTINGS_KEY]?.keepLocalCopy);
});

el.keepLocal.addEventListener("change", () => {
  void chrome.storage.local.set({
    [SETTINGS_KEY]: { keepLocalCopy: el.keepLocal.checked },
  });
});

let currentStatus = { phase: "idle" };

function send(message) {
  return chrome.runtime.sendMessage(message).catch((err) => {
    el.message.textContent = err?.message ?? String(err);
  });
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function activeTabId() {
  return (await activeTab())?.id ?? null;
}

async function showControls() {
  const tabId = await activeTabId();
  if (tabId == null) return;
  const status = {
    ...currentStatus,
    withMic: el.mic.checked,
    withCamera: el.camera.checked,
  };
  await chrome.tabs
    .sendMessage(tabId, { type: "vc:show-controls", status })
    .catch(() => {
      el.message.textContent = "Open a normal web page before showing controls.";
    });
}

function render(status) {
  currentStatus = status ?? { phase: "idle" };
  const phase = currentStatus.phase;
  const active = phase === "recording" || phase === "paused";

  // Uploads run in the background — a new recording can start while the
  // previous one finishes uploading.
  el.primary.disabled = phase === "creating";
  el.primary.classList.toggle("stop", active);
  el.primary.textContent = active
    ? "Stop recording"
    : phase === "creating"
      ? "Starting..."
      : "Start recording";

  el.mic.disabled = phase === "creating";
  el.camera.disabled = phase === "creating";

  el.status.textContent =
    phase === "recording"
      ? "Recording"
      : phase === "paused"
        ? "Paused"
        : phase === "uploading"
          ? "Uploading in background — you can record again"
          : phase === "error"
            ? "Error"
            : "Ready to record";

  if (currentStatus.error) {
    el.message.textContent = currentStatus.error;
  } else if (currentStatus.shareUrl) {
    el.message.textContent = "Link opened in a new tab.";
  } else if (currentStatus.savedLocally) {
    el.message.textContent = "Saved locally because no signed-in session was found.";
  } else if (phase !== "error") {
    el.message.textContent = "";
  }
}

el.primary.addEventListener("click", async () => {
  const phase = currentStatus.phase;
  if (phase === "recording" || phase === "paused") {
    await send({ type: "vc:stop-recording" });
    return;
  }

  await send({
    type: "vc:start-recording",
    withMic: el.mic.checked,
    withCamera: el.camera.checked,
  });
  await showControls();
});

el.controls.addEventListener("click", () => {
  void showControls();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "vc:status") render(msg.status);
});

send({ type: "vc:get-status" }).then((response) => {
  render(response?.status ?? { phase: "idle" });
});
