const el = {
  status: document.getElementById("status"),
  mode: document.getElementById("mode"),
  mic: document.getElementById("mic"),
  camera: document.getElementById("camera"),
  primary: document.getElementById("primary"),
  controls: document.getElementById("open-controls"),
  message: document.getElementById("message"),
};

let currentStatus = { phase: "idle" };

const MODE_HELP = {
  tab: "Best for Google Meet, Teams, Zoom web, and browser audio.",
  fullscreen:
    "Screen/window recording only captures meeting audio if Chrome offers and grants shared audio.",
  camera: "Records the camera and microphone only.",
};

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
    mode: el.mode.value,
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

  el.primary.disabled = phase === "creating" || phase === "uploading";
  el.primary.classList.toggle("stop", active);
  el.primary.textContent = active
    ? "Stop recording"
    : phase === "creating"
      ? "Starting..."
      : phase === "uploading"
        ? "Uploading..."
        : "Start recording";

  el.mode.disabled = active || phase === "creating" || phase === "uploading";
  el.mic.disabled = phase === "creating" || phase === "uploading";
  el.camera.disabled = phase === "creating" || phase === "uploading";

  el.status.textContent =
    phase === "recording"
      ? "Recording"
      : phase === "paused"
        ? "Paused"
        : phase === "uploading"
          ? "Uploading recording"
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

function renderModeHelp() {
  document.getElementById("mode-help").textContent =
    MODE_HELP[el.mode.value] ?? MODE_HELP.tab;
}

el.primary.addEventListener("click", async () => {
  const phase = currentStatus.phase;
  if (phase === "recording" || phase === "paused") {
    await send({ type: "vc:stop-recording" });
    return;
  }

  await send({
    type: "vc:start-recording",
    mode: el.mode.value,
    withMic: el.mic.checked,
    withCamera: el.camera.checked,
  });
  await showControls();
});

el.mode.addEventListener("change", renderModeHelp);

el.controls.addEventListener("click", () => {
  void showControls();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "vc:status") render(msg.status);
});

send({ type: "vc:get-status" }).then((response) => {
  render(response?.status ?? { phase: "idle" });
});

activeTab().then((tab) => {
  const url = tab?.url ?? "";
  if (/^https:\/\/meet\.google\.com\//.test(url)) {
    el.mode.value = "tab";
  }
  renderModeHelp();
});
