// API_BASES comes from shared-config.js, loaded before this script.

const el = {
  status: document.getElementById("status"),
  badge: document.getElementById("badge"),
  screenStatus: document.getElementById("screen-status"),
  mic: document.getElementById("mic-toggle"),
  camera: document.getElementById("camera-toggle"),
  keepLocal: document.getElementById("keep-local"),
  destination: document.getElementById("destination"),
  destinationPicker: document.getElementById("destination-picker"),
  destinationTrigger: document.getElementById("destination-trigger"),
  destinationLabel: document.getElementById("destination-label"),
  destinationMenu: document.getElementById("destination-menu"),
  destinationOptions: document.querySelectorAll(".destination-option"),
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
let keepLocalPreference = false;
let signedIn = false;
let accountUser = null;
let loginUrl = "https://capca-cam.vercel.app/login";
let driveConnected = false;
let driveConfigured = false;

el.destination.value = "local";

const accountLine = document.createElement("p");
accountLine.className = "account-line";
document.querySelector(".actions")?.before(accountLine);

void chrome.storage.local.get(SETTINGS_KEY).then((store) => {
  keepLocalPreference = Boolean(store[SETTINGS_KEY]?.keepLocalCopy);
  render();
});

el.keepLocal.addEventListener("change", () => {
  keepLocalPreference = el.keepLocal.checked;
  void chrome.storage.local.set({
    [SETTINGS_KEY]: { keepLocalCopy: keepLocalPreference },
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

function selectedDestinationOption() {
  return el.destination.options[el.destination.selectedIndex];
}

function closeDestinationMenu() {
  el.destinationMenu.hidden = true;
  el.destinationTrigger.setAttribute("aria-expanded", "false");
}

function syncDestinationMenu() {
  const selectedValue = el.destination.value;
  const selectedOption = selectedDestinationOption();
  el.destinationLabel.textContent =
    selectedOption?.textContent ?? DESTINATION_LABEL[selectedValue] ?? "Capca Cloud";
  el.destinationTrigger.disabled = el.destination.disabled;

  for (const option of el.destinationOptions) {
    const matchingSelectOption = el.destination.querySelector(
      `option[value="${option.dataset.value}"]`,
    );
    option.textContent =
      matchingSelectOption?.textContent ??
      DESTINATION_LABEL[option.dataset.value] ??
      option.textContent;
    option.disabled = Boolean(matchingSelectOption?.disabled);
    option.setAttribute(
      "aria-selected",
      option.dataset.value === selectedValue ? "true" : "false",
    );
  }

  if (el.destination.disabled) {
    closeDestinationMenu();
  }
}

el.destinationTrigger.addEventListener("click", () => {
  if (el.destinationTrigger.disabled) return;
  const shouldOpen = el.destinationMenu.hidden;
  el.destinationMenu.hidden = !shouldOpen;
  el.destinationTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
});

for (const option of el.destinationOptions) {
  option.addEventListener("click", () => {
    if (option.disabled) return;
    el.destination.value = option.dataset.value;
    closeDestinationMenu();
    syncDestinationMenu();
    el.destination.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

document.addEventListener("click", (event) => {
  if (!el.destinationPicker.contains(event.target)) {
    closeDestinationMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDestinationMenu();
    el.destinationTrigger.focus();
  }
});
syncDestinationMenu();

function formatGB(bytes) {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function renderBadge(usage) {
  const destination = el.destination.value;
  if (!signedIn) {
    el.badge.textContent = "Local only";
  } else if (destination === "drive") {
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
  const capcaOption = el.destination.querySelector('option[value="capca"]');
  const driveOption = el.destination.querySelector('option[value="drive"]');
  capcaOption.disabled = !signedIn;
  capcaOption.textContent = signedIn
    ? "Capca Cloud"
    : "Capca Cloud (sign in required)";
  driveOption.disabled = !signedIn || !driveConnected;
  driveOption.textContent = !signedIn
    ? "Google Drive (sign in required)"
    : driveConnected
      ? "Google Drive"
      : "Google Drive (not connected)";
  if (!signedIn && el.destination.value !== "local") {
    el.destination.value = "local";
  }
  if (el.destination.value === "drive" && !driveConnected) {
    el.message.textContent =
      "Connect Google Drive in Settings to record straight to it.";
  } else if (el.message.textContent.startsWith("Connect Google Drive")) {
    el.message.textContent = "";
  }
  syncDestinationMenu();
}

el.destination.addEventListener("change", () => {
  updateDestinationAvailability();
  renderBadge(lastUsage);
});

let lastUsage = null;

async function loadAccountState() {
  const account = await chrome.runtime
    .sendMessage({ type: "vc:get-account-state" })
    .catch(() => null);
  signedIn = Boolean(account?.signedIn);
  loginUrl = account?.loginUrl || loginUrl;
  if (account?.ok) {
    accountUser = account.user;
    lastUsage = account.settings;
    el.destination.value = account.settings?.defaultDestination || "capca";
    driveConfigured = Boolean(account.drive?.configured);
    driveConnected = Boolean(account.drive?.connected);
    updateDestinationAvailability();
    renderBadge(lastUsage);
    render(currentStatus);
    return;
  }
  el.destination.value = "local";
  updateDestinationAvailability();
  renderBadge(null);
  render(currentStatus);
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
    : !signedIn && phase !== "creating"
      ? "Sign in to share"
      : phase === "creating"
        ? "Starting..."
        : "Start recording";
  el.controls.textContent = signedIn ? "Show controls" : "Record locally";

  el.mic.disabled = phase === "creating" || active;
  el.camera.disabled = phase === "creating" || active;
  el.destination.disabled = phase === "creating" || active;
  el.keepLocal.checked = !signedIn || keepLocalPreference;
  el.keepLocal.disabled = !signedIn;
  accountLine.textContent = signedIn
    ? `Signed in as: ${accountUser?.name || accountUser?.email || "Capca user"}`
    : "Not signed in";
  syncDestinationMenu();
  renderBadge(lastUsage);

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
  } else if (!signedIn) {
    el.message.textContent =
      "Sign in to save to Capca Cloud, add recordings to your dashboard, or share links.";
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
  if (!signedIn) {
    await send({ type: "vc:open-url", url: loginUrl });
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
    signedIn,
  });
  await showControls();
});

el.controls.addEventListener("click", () => {
  if (!signedIn) {
    void send({
      type: "vc:start-recording",
      withMic: micOn,
      withCamera: cameraOn,
      destination: "local",
      signedIn: false,
    }).then(() => showControls());
    return;
  }
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
