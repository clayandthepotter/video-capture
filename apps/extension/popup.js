// API_BASES comes from shared-config.js, loaded before this script.

const el = {
  status: document.getElementById("status"),
  badge: document.getElementById("badge"),
  screenStatus: document.getElementById("screen-status"),
  mic: document.getElementById("mic-toggle"),
  camera: document.getElementById("camera-toggle"),
  keepLocal: document.getElementById("keep-local"),
  destination: document.getElementById("destination"),
  primary: document.getElementById("primary"),
  controls: document.getElementById("open-controls"),
  message: document.getElementById("message"),
  progress: document.getElementById("progress"),
  progressLabel: document.getElementById("progress-label"),
  progressValue: document.getElementById("progress-value"),
};

const SETTINGS_KEY = "capca:settings";
const DESTINATION_LABEL = {
  capca: "Capca Cloud",
  drive: "Google Drive",
  local: "This device",
};

let micOn = true;
let cameraOn = true;
let driveConnected = false;
let driveConfigured = false;
let apiBase = null; // the API_BASES entry that answered, reused for links

void chrome.storage.local.get(SETTINGS_KEY).then((store) => {
  el.keepLocal.checked = Boolean(store[SETTINGS_KEY]?.keepLocalCopy);
});

el.keepLocal.addEventListener("change", () => {
  void chrome.storage.local.set({
    [SETTINGS_KEY]: { keepLocalCopy: el.keepLocal.checked },
  });
});

function renderToggle(button, on) {
  const value = button.querySelector("[data-value]");
  value.textContent = on ? "On" : "Off";
  value.dataset.off = on ? "false" : "true";
}

el.mic.addEventListener("click", () => {
  micOn = !micOn;
  renderToggle(el.mic, micOn);
});
el.camera.addEventListener("click", () => {
  cameraOn = !cameraOn;
  renderToggle(el.camera, cameraOn);
});
renderToggle(el.mic, micOn);
renderToggle(el.camera, cameraOn);

function formatGB(bytes) {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function renderBadge(usage) {
  const destination = el.destination.value;
  if (destination === "drive") {
    el.badge.textContent = driveConnected ? "Free with Drive" : "Drive not connected";
  } else if (destination === "local") {
    el.badge.textContent = "Saved to your device";
  } else if (usage) {
    el.badge.textContent = `${formatGB(usage.capcaUsageBytes)} of ${formatGB(usage.capcaQuotaBytes)} GB used`;
  } else {
    el.badge.textContent = "Capca Cloud";
  }
}

function updateDestinationAvailability() {
  const driveOption = el.destination.querySelector('option[value="drive"]');
  driveOption.disabled = !driveConnected;
  driveOption.textContent = driveConnected
    ? "Google Drive"
    : "Google Drive (not connected)";
  if (el.destination.value === "drive" && !driveConnected) {
    el.message.textContent =
      "Connect Google Drive in Settings to record straight to it.";
  } else if (el.message.textContent.startsWith("Connect Google Drive")) {
    el.message.textContent = "";
  }
}

el.destination.addEventListener("change", () => {
  updateDestinationAvailability();
  renderBadge(lastUsage);
});

let lastUsage = null;

async function loadAccountState() {
  for (const base of API_BASES) {
    try {
      const [settingsRes, driveRes] = await Promise.all([
        fetch(`${base}/api/settings`, { credentials: "include" }),
        fetch(`${base}/api/drive/status`, { credentials: "include" }),
      ]);
      if (settingsRes.status === 401) continue; // not signed in on this base
      if (!settingsRes.ok) continue;

      apiBase = base;
      const settings = await settingsRes.json();
      lastUsage = settings;
      el.destination.value = settings.defaultDestination || "capca";

      if (driveRes.ok) {
        const drive = await driveRes.json();
        driveConfigured = drive.configured;
        driveConnected = drive.connected;
      }
      updateDestinationAvailability();
      renderBadge(lastUsage);
      return;
    } catch {
      // try next base
    }
  }
  // Not signed in anywhere reachable — defaults stand, Capca Cloud stays
  // selected, and starting will surface "sign in" via the usual fallback.
  renderBadge(null);
}
void loadAccountState();

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
  const status = { ...currentStatus, withMic: micOn, withCamera: cameraOn };
  await chrome.tabs
    .sendMessage(tabId, { type: "vc:show-controls", status })
    .catch(() => {
      el.message.textContent = "Open a normal web page before showing controls.";
    });
}

function formatMB(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function render(status) {
  currentStatus = status ?? { phase: "idle" };
  const phase = currentStatus.phase;
  const active = phase === "recording" || phase === "paused";
  const uploading = phase === "uploading";

  el.primary.disabled = phase === "creating";
  el.primary.classList.toggle("stop", active);
  el.primary.querySelector("span").textContent = active
    ? "Stop recording"
    : phase === "creating"
      ? "Starting..."
      : "Start recording";

  el.mic.disabled = phase === "creating" || active;
  el.camera.disabled = phase === "creating" || active;
  el.destination.disabled = phase === "creating" || active;

  el.screenStatus.textContent =
    phase === "recording" ? "Recording" : phase === "paused" ? "Paused" : "Ready";

  el.progress.hidden = !uploading;
  if (uploading) {
    el.progressLabel.textContent = `Saving to ${DESTINATION_LABEL[el.destination.value] ?? "Capca Cloud"}`;
  }

  el.status.textContent =
    phase === "recording"
      ? "Recording"
      : phase === "paused"
        ? "Paused"
        : uploading
          ? "Uploading in background — you can record again"
          : phase === "error"
            ? "Error"
            : "Ready to record";

  if (currentStatus.error) {
    el.message.textContent = currentStatus.error;
  } else if (currentStatus.shareUrl) {
    el.message.textContent = "Link opened in a new tab.";
  } else if (currentStatus.savedLocally) {
    el.message.textContent = currentStatus.uploadNote || "Saved to your device.";
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

  const destination = el.destination.value;
  if (destination === "drive" && !driveConnected) {
    el.message.textContent = driveConfigured
      ? "Connect Google Drive in Settings first."
      : "Google Drive isn't set up on this server yet.";
    return;
  }

  el.progressValue.textContent = "0 MB";
  await send({
    type: "vc:start-recording",
    withMic: micOn,
    withCamera: cameraOn,
    destination,
  });
  await showControls();
});

el.controls.addEventListener("click", () => {
  void showControls();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "vc:status") render(msg.status);
  if (msg.type === "vc:upload-progress" && !el.progress.hidden) {
    el.progressValue.textContent = formatMB(msg.uploadedBytes);
  }
});

send({ type: "vc:get-status" }).then((response) => {
  render(response?.status ?? { phase: "idle" });
});
