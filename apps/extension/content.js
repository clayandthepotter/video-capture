// Preloaded on normal web pages so the background/popup can show controls on
// demand. It must stay passive on page load: mounting the bubble creates a
// camera iframe, which makes Chrome mark every tab as recording.

(() => {
  if (window.__capcaContentLoaded) return;
  window.__capcaContentLoaded = true;

  // Let the Capca web app detect that the extension is installed (content
  // scripts share the DOM with the page, so a data attribute is visible to
  // page scripts even though JS worlds are isolated). Delayed so React/SSR
  // sites finish hydrating before the <html> element changes.
  setTimeout(() => {
    try {
      document.documentElement.dataset.capcaExtension =
        chrome.runtime.getManifest().version;
    } catch {}
  }, 2000);

  let mounted = false;
  let launcher = null;
  const UI_STATE_KEY = "capca:ui-state:v1";
  const SETTINGS_KEY = "capca:settings";
  const DESTINATION_LABEL = {
    capca: "Capca Cloud",
    drive: "Google Drive",
    local: "This device",
  };

  async function readUiState() {
    try {
      const store = await chrome.storage.local.get(UI_STATE_KEY);
      return store[UI_STATE_KEY] ?? {};
    } catch {
      return {};
    }
  }

  async function writeUiState(state) {
    try {
      await chrome.storage.local.set({ [UI_STATE_KEY]: state });
    } catch {}
  }

  function toggleLauncher(status = null) {
    if (launcher) {
      launcher.remove();
      launcher = null;
      return;
    }
    launcher = mountLauncher(status);
  }

  function mountLauncher(initialStatus = null) {
    const existing = document.getElementById("__capca_launcher_host");
    if (existing) existing.remove();

    const host = document.createElement("div");
    host.id = "__capca_launcher_host";
    const shadow = host.attachShadow({ mode: "open" });
    const styles = document.createElement("link");
    styles.rel = "stylesheet";
    styles.href = chrome.runtime.getURL("content.css");
    shadow.appendChild(styles);
    document.documentElement.appendChild(host);

    const SVG = {
      arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
      camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.2 3.1a.6.6 0 0 0 .8-.5V8.4a.6.6 0 0 0-.8-.5L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
      drive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 4.5h7.6l5 8.7-3.8 6.3H7L3.2 13.2z"/><path d="m8.2 4.5 5.1 8.7"/><path d="M3.2 13.2h10.1"/><path d="m15.8 4.5-5 8.7"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
      screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
    };

    const root = document.createElement("div");
    root.id = "__vc_launcher_root";
    root.innerHTML = `
      <section class="vc-launcher" role="dialog" aria-label="Capca recorder">
        <header class="vc-launcher-header">
          <span class="vc-launcher-logo"><span></span></span>
          <div class="vc-launcher-title">
            <h1>Capca</h1>
            <p data-role="status">Ready to record</p>
          </div>
          <span class="vc-launcher-badge" data-role="badge">Capca Cloud</span>
          <button class="vc-launcher-close" type="button" title="Close" aria-label="Close">${SVG.close}</button>
        </header>
        <div class="vc-launcher-rows">
          <div class="vc-launcher-row">
            <span class="vc-launcher-icon">${SVG.screen}</span>
            <span class="vc-launcher-label">Screen</span>
            <span class="vc-launcher-value" data-role="screen-status">Ready</span>
          </div>
          <button class="vc-launcher-row" type="button" data-action="toggle-mic">
            <span class="vc-launcher-icon">${SVG.mic}</span>
            <span class="vc-launcher-label">Microphone</span>
            <span class="vc-launcher-value" data-role="mic-value">On</span>
          </button>
          <button class="vc-launcher-row" type="button" data-action="toggle-camera">
            <span class="vc-launcher-icon">${SVG.camera}</span>
            <span class="vc-launcher-label">Camera</span>
            <span class="vc-launcher-value" data-role="camera-value">On</span>
          </button>
          <div class="vc-launcher-row vc-launcher-destination">
            <span class="vc-launcher-icon">${SVG.drive}</span>
            <span class="vc-launcher-label">Destination</span>
            <div class="vc-launcher-picker">
              <button class="vc-launcher-select" type="button" aria-haspopup="listbox" aria-expanded="false">
                <span data-role="destination-label">This device</span>${SVG.chevron}
              </button>
              <div class="vc-launcher-menu" role="listbox" hidden>
                <button type="button" role="option" data-destination="capca" aria-selected="false">Capca Cloud</button>
                <button type="button" role="option" data-destination="drive" aria-selected="false">Google Drive</button>
                <button type="button" role="option" data-destination="local" aria-selected="true">This device</button>
              </div>
            </div>
          </div>
        </div>
        <label class="vc-launcher-check">
          <input type="checkbox" data-role="keep-local" />
          <span>Always save a local copy</span>
        </label>
        <p class="vc-launcher-account" data-role="account"></p>
        <div class="vc-launcher-actions">
          <button class="vc-launcher-primary" type="button" data-action="primary"><span>Start recording</span>${SVG.arrow}</button>
          <button class="vc-launcher-secondary" type="button" data-action="show-controls">Show controls</button>
        </div>
        <div class="vc-launcher-progress" data-role="progress" hidden>
          <div><span data-role="progress-label">Saving to Capca Cloud</span><span data-role="progress-value">0 MB</span></div>
          <span><span></span></span>
        </div>
        <p class="vc-launcher-message" data-role="message" role="status"></p>
      </section>
    `;
    shadow.appendChild(root);

    const el = {
      account: root.querySelector('[data-role="account"]'),
      badge: root.querySelector('[data-role="badge"]'),
      camera: root.querySelector('[data-action="toggle-camera"]'),
      cameraValue: root.querySelector('[data-role="camera-value"]'),
      close: root.querySelector(".vc-launcher-close"),
      destinationLabel: root.querySelector('[data-role="destination-label"]'),
      keepLocal: root.querySelector('[data-role="keep-local"]'),
      menu: root.querySelector(".vc-launcher-menu"),
      message: root.querySelector('[data-role="message"]'),
      mic: root.querySelector('[data-action="toggle-mic"]'),
      micValue: root.querySelector('[data-role="mic-value"]'),
      options: root.querySelectorAll("[data-destination]"),
      primary: root.querySelector('[data-action="primary"]'),
      progress: root.querySelector('[data-role="progress"]'),
      progressLabel: root.querySelector('[data-role="progress-label"]'),
      progressValue: root.querySelector('[data-role="progress-value"]'),
      screenStatus: root.querySelector('[data-role="screen-status"]'),
      secondary: root.querySelector('[data-action="show-controls"]'),
      select: root.querySelector(".vc-launcher-select"),
      status: root.querySelector('[data-role="status"]'),
    };

    let currentStatus = initialStatus ?? { phase: "idle" };
    let micOn = currentStatus.withMic ?? true;
    let cameraOn = currentStatus.withCamera ?? true;
    let keepLocalPreference = false;
    let signedIn = false;
    let accountUser = null;
    let loginUrl = "https://capca-cam.vercel.app/login";
    let destination = "local";
    let driveConfigured = false;
    let driveConnected = false;
    let lastUsage = null;

    function formatGB(bytes) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1);
    }

    function formatMB(bytes) {
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    }

    function closeMenu() {
      el.menu.hidden = true;
      el.select.setAttribute("aria-expanded", "false");
    }

    function renderDestination() {
      if (!signedIn && destination !== "local") {
        destination = "local";
      }
      if (destination === "drive" && !driveConnected) {
        destination = "capca";
      }
      el.destinationLabel.textContent = DESTINATION_LABEL[destination] ?? "Capca Cloud";
      for (const option of el.options) {
        const value = option.dataset.destination;
        option.textContent =
          !signedIn && value !== "local"
            ? `${DESTINATION_LABEL[value]} (sign in required)`
            : value === "drive" && !driveConnected
            ? "Google Drive (not connected)"
            : DESTINATION_LABEL[value];
        option.disabled =
          (!signedIn && value !== "local") || (value === "drive" && !driveConnected);
        option.setAttribute("aria-selected", value === destination ? "true" : "false");
      }
    }

    function renderBadge() {
      if (!signedIn) {
        el.badge.textContent = "Local only";
      } else if (destination === "drive") {
        el.badge.textContent = driveConnected ? "Free with Drive" : "Drive not connected";
      } else if (destination === "local") {
        el.badge.textContent = "Saved to your device";
      } else if (lastUsage) {
        el.badge.textContent = `${formatGB(lastUsage.capcaUsageBytes)} of ${formatGB(lastUsage.capcaQuotaBytes)} GB used`;
      } else {
        el.badge.textContent = "Capca Cloud";
      }
    }

    function render(status = currentStatus) {
      currentStatus = status ?? { phase: "idle" };
      const phase = currentStatus.phase;
      const active = phase === "recording" || phase === "paused";
      const uploading = phase === "uploading";
      const creating = phase === "creating";

      el.primary.disabled = creating;
      el.primary.classList.toggle("vc-launcher-stop", active);
      el.primary.querySelector("span").textContent =
        !signedIn && !active && !creating
          ? "Sign in to share"
          : active
            ? "Stop recording"
            : creating
              ? "Starting..."
              : "Start recording";
      el.secondary.textContent = signedIn ? "Show controls" : "Record locally";
      el.mic.disabled = creating || active;
      el.camera.disabled = creating || active;
      el.select.disabled = creating || active;
      el.keepLocal.checked = !signedIn || keepLocalPreference;
      el.keepLocal.disabled = !signedIn;
      el.account.textContent = signedIn
        ? `Signed in as: ${accountUser?.name || accountUser?.email || "Capca user"}`
        : "Not signed in";

      el.micValue.textContent = micOn ? "On" : "Off";
      el.micValue.dataset.off = micOn ? "false" : "true";
      el.cameraValue.textContent = cameraOn ? "On" : "Off";
      el.cameraValue.dataset.off = cameraOn ? "false" : "true";
      el.screenStatus.textContent =
        phase === "recording" ? "Recording" : phase === "paused" ? "Paused" : "Ready";
      el.status.textContent =
        phase === "recording"
          ? "Recording"
          : phase === "paused"
            ? "Paused"
            : uploading
              ? "Uploading in background"
              : phase === "error"
                ? "Error"
                : "Ready to record";
      el.progress.hidden = !uploading;
      if (uploading) {
        el.progressLabel.textContent = `Saving to ${DESTINATION_LABEL[destination] ?? "Capca Cloud"}`;
      }

      if (currentStatus.error) {
        el.message.textContent = currentStatus.error;
      } else if (currentStatus.shareUrl) {
        el.message.textContent = "Link opened in a new tab.";
      } else if (currentStatus.savedLocally) {
        el.message.textContent =
          currentStatus.uploadNote || "Saved to your device.";
      } else if (!signedIn) {
        el.message.textContent =
          "Sign in to save to Capca Cloud, add recordings to your dashboard, or share links.";
      } else if (!el.message.textContent.startsWith("Connect Google Drive")) {
        el.message.textContent = "";
      }

      renderDestination();
      renderBadge();
    }

    el.select.addEventListener("click", () => {
      if (el.select.disabled) return;
      const open = el.menu.hidden;
      el.menu.hidden = !open;
      el.select.setAttribute("aria-expanded", open ? "true" : "false");
    });

    for (const option of el.options) {
      option.addEventListener("click", () => {
        if (option.disabled) return;
        destination = option.dataset.destination;
        closeMenu();
        el.message.textContent = "";
        render();
      });
    }

    root.addEventListener("click", (event) => {
      if (!event.target.closest(".vc-launcher-picker")) closeMenu();
    });

    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        el.select.focus();
      }
    });

    el.mic.addEventListener("click", () => {
      micOn = !micOn;
      render();
    });

    el.camera.addEventListener("click", () => {
      cameraOn = !cameraOn;
      render();
    });

    el.keepLocal.addEventListener("change", () => {
      keepLocalPreference = el.keepLocal.checked;
      void chrome.storage.local.set({
        [SETTINGS_KEY]: { keepLocalCopy: keepLocalPreference },
      });
    });

    el.primary.addEventListener("click", () => {
      const phase = currentStatus.phase;
      if (phase === "recording" || phase === "paused") {
        void chrome.runtime.sendMessage({ type: "vc:stop-recording" });
        return;
      }
      if (!signedIn) {
        void chrome.runtime.sendMessage({ type: "vc:open-url", url: loginUrl });
        return;
      }
      if (destination === "drive" && !driveConnected) {
        el.message.textContent = driveConfigured
          ? "Connect Google Drive in Settings first."
          : "Google Drive isn't set up on this server yet.";
        return;
      }
      el.progressValue.textContent = "0 MB";
      void chrome.runtime.sendMessage({
        type: "vc:start-recording",
        withMic: micOn,
        withCamera: cameraOn,
        destination,
        signedIn,
      });
    });

    el.secondary.addEventListener("click", () => {
      if (!signedIn) {
        el.progressValue.textContent = "0 MB";
        void chrome.runtime.sendMessage({
          type: "vc:start-recording",
          withMic: micOn,
          withCamera: cameraOn,
          destination: "local",
          signedIn: false,
        });
        return;
      }
      mountControls({ ...currentStatus, withMic: micOn, withCamera: cameraOn });
    });

    el.close.addEventListener("click", () => {
      host.remove();
      launcher = null;
    });

    void chrome.storage.local.get(SETTINGS_KEY).then((store) => {
      keepLocalPreference = Boolean(store[SETTINGS_KEY]?.keepLocalCopy);
      render();
    });

    void chrome.runtime
      .sendMessage({ type: "vc:get-account-state" })
      .then((account) => {
        signedIn = Boolean(account?.signedIn);
        loginUrl = account?.loginUrl || loginUrl;
        if (account?.ok) {
          accountUser = account.user;
          lastUsage = account.settings;
          destination = account.settings?.defaultDestination || "capca";
          driveConfigured = Boolean(account.drive?.configured);
          driveConnected = Boolean(account.drive?.connected);
        } else {
          destination = "local";
          driveConfigured = false;
          driveConnected = false;
        }
        render();
      })
      .catch(() => render());

    render(currentStatus);

    return {
      applyStatus(status) {
        render(status);
      },
      uploadProgress(uploadedBytes) {
        if (!el.progress.hidden) {
          el.progressValue.textContent = formatMB(uploadedBytes);
        }
      },
      remove() {
        host.remove();
      },
    };
  }

  function removeControls() {
    document.getElementById("__vc_host")?.remove();
    mounted = false;
  }

  function mountControls(initialStatus = null) {
    const existingHost = document.getElementById("__vc_host");
    if (existingHost) return;
    mounted = true;

    // All UI lives in a shadow root so page CSS can never restyle it (sites
    // with aggressive button/flex rules were stretching the toolbar) and our
    // styles can never leak into the page.
    const host = document.createElement("div");
    host.id = "__vc_host";
    const shadow = host.attachShadow({ mode: "open" });
    const styles = document.createElement("link");
    styles.rel = "stylesheet";
    styles.href = chrome.runtime.getURL("content.css");
    shadow.appendChild(styles);
    document.documentElement.appendChild(host);

  const SVG = {
    record: '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
    micOff: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M4 4l16 16"/></svg>',
    cam: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.2 3.1a.6.6 0 0 0 .8-.5V8.4a.6.6 0 0 0-.8-.5L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    camOff: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.2 3.1a.6.6 0 0 0 .8-.5V8.4a.6.6 0 0 0-.8-.5L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M3 3l18 18"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  let state = "idle"; // idle | starting | recording | paused | uploading
  let lastShareUrl = null;
  let savedLocally = false;
  let micOn = initialStatus?.withMic ?? true;
  let camOn = initialStatus?.withCamera ?? true;
  let seconds = 0;
  let timerId = null;
  let uiState = {};

  const root = document.createElement("div");
  root.id = "__vc_root";
  shadow.appendChild(root);

  // --- camera bubble ---
  const bubble = document.createElement("div");
  bubble.className = "vc-bubble";
  const frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL("bubble.html");
  frame.allow = "camera; microphone";
  frame.className = "vc-bubble-frame";
  bubble.appendChild(frame);

  // --- control bar ---
  const bar = document.createElement("div");
  bar.className = "vc-bar";
  bar.innerHTML = `
    <button class="vc-brand" data-action="collapse" title="Hide toolbar" aria-label="Hide toolbar"><span class="vc-brand-dot"></span></button>
    <button class="vc-btn vc-btn-primary" data-action="record">${SVG.record}<span>Record</span></button>
    <button class="vc-btn vc-btn-icon" data-action="pause" title="Pause" hidden>${SVG.pause}</button>
    <span class="vc-timer" hidden>0:00</span>
    <span class="vc-upload" hidden><span class="vc-spinner-light"></span>Uploading</span>
    <button class="vc-btn vc-btn-icon" data-action="mic" title="Toggle microphone">${SVG.mic}</button>
    <button class="vc-btn vc-btn-icon" data-action="camera" title="Toggle camera">${SVG.cam}</button>
    <span class="vc-divider"></span>
    <button class="vc-btn vc-btn-icon vc-btn-ghost" data-action="close" title="Close">${SVG.close}</button>
  `;

  const restore = document.createElement("button");
  restore.className = "vc-restore";
  restore.type = "button";
  restore.title = "Show toolbar";
  restore.setAttribute("aria-label", "Show toolbar");
  restore.hidden = true;
  restore.innerHTML = `<span class="vc-brand-dot"></span>`;

  const countdown = document.createElement("div");
  countdown.className = "vc-countdown";
  countdown.hidden = true;

  root.append(bubble, bar, restore, countdown);

  const el = {
    collapse: bar.querySelector('[data-action="collapse"]'),
    record: bar.querySelector('[data-action="record"]'),
    pause: bar.querySelector('[data-action="pause"]'),
    mic: bar.querySelector('[data-action="mic"]'),
    camera: bar.querySelector('[data-action="camera"]'),
    close: bar.querySelector('[data-action="close"]'),
    timer: bar.querySelector(".vc-timer"),
    upload: bar.querySelector(".vc-upload"),
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setFixedPosition(target, position) {
    if (!position) return null;
    const rect = target.getBoundingClientRect();
    const width = rect.width || target.offsetWidth || 1;
    const height = rect.height || target.offsetHeight || 1;
    const next = {
      left: clamp(position.left, 8, Math.max(8, window.innerWidth - width - 8)),
      top: clamp(position.top, 8, Math.max(8, window.innerHeight - height - 8)),
    };
    target.style.left = `${Math.round(next.left)}px`;
    target.style.top = `${Math.round(next.top)}px`;
    target.style.right = "auto";
    target.style.bottom = "auto";
    return next;
  }

  function getFixedPosition(target) {
    const rect = target.getBoundingClientRect();
    return { left: Math.round(rect.left), top: Math.round(rect.top) };
  }

  function persistUiState(patch) {
    uiState = { ...uiState, ...patch };
    void writeUiState(uiState);
  }

  function setToolbarCollapsed(collapsed, options = {}) {
    const { persist = true, syncRestore = true } = options;
    let restorePosition = null;
    if (collapsed && syncRestore) {
      restorePosition = setFixedPosition(restore, getFixedPosition(bar));
    }
    bar.hidden = collapsed;
    restore.hidden = !collapsed;
    if (persist) {
      persistUiState({
        collapsed,
        ...(restorePosition ? { restore: restorePosition } : {}),
      });
    }
  }

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function render() {
    el.pause.hidden = !(state === "recording" || state === "paused");
    el.timer.hidden = el.pause.hidden;
    el.timer.textContent = fmt(seconds);
    el.pause.innerHTML = state === "paused" ? SVG.play : SVG.pause;
    el.mic.innerHTML = micOn ? SVG.mic : SVG.micOff;
    el.mic.classList.toggle("vc-btn-off", !micOn);
    el.camera.innerHTML = camOn ? SVG.cam : SVG.camOff;
    el.camera.classList.toggle("vc-btn-off", !camOn);
    bubble.style.display = camOn ? "" : "none";

    // Uploading happens in the background — the record button stays usable.
    el.upload.hidden = state !== "uploading";
    if (state === "recording" || state === "paused") {
      el.record.innerHTML = `${SVG.stop}<span>Stop</span>`;
      el.record.className = "vc-btn vc-btn-danger";
    } else if (state === "starting") {
      el.record.innerHTML = `<span>…</span>`;
      el.record.className = "vc-btn vc-btn-primary";
    } else {
      el.record.innerHTML = `${SVG.record}<span>Record</span>`;
      el.record.className = "vc-btn vc-btn-primary";
    }
    el.record.disabled = state === "starting";
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      seconds += 1;
      el.timer.textContent = fmt(seconds);
    }, 1000);
  }

  async function runCountdown() {
    countdown.hidden = false;
    for (const n of ["3", "2", "1"]) {
      countdown.textContent = n;
      countdown.classList.remove("vc-pop");
      void countdown.offsetWidth; // restart animation
      countdown.classList.add("vc-pop");
      await new Promise((r) => setTimeout(r, 800));
    }
    countdown.hidden = true;
  }

  el.record.addEventListener("click", () => {
    if (state === "idle" || state === "uploading") {
      state = "starting";
      render();
      chrome.runtime.sendMessage({
        type: "vc:start-recording",
        withMic: micOn,
        withCamera: camOn,
      });
    } else if (state === "recording" || state === "paused") {
      clearInterval(timerId);
      chrome.runtime.sendMessage({ type: "vc:stop-recording" });
      state = "uploading";
      render();
    }
  });

  el.collapse.addEventListener("click", () => {
    setToolbarCollapsed(true);
  });
  el.collapse.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  restore.addEventListener("click", () => {
    if (restore.dataset.dragged === "true") return;
    setToolbarCollapsed(false);
  });
  restore.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  el.pause.addEventListener("click", () => {
    if (state === "recording") {
      chrome.runtime.sendMessage({ type: "vc:pause-recording" });
    } else if (state === "paused") {
      chrome.runtime.sendMessage({ type: "vc:resume-recording" });
    }
  });

  el.mic.addEventListener("click", () => {
    micOn = !micOn;
    chrome.runtime.sendMessage({ type: "vc:set-mic", enabled: micOn });
    render();
  });

  // Hiding the bubble removes it from the page, and therefore from the
  // recording — the capture is of the page itself.
  el.camera.addEventListener("click", () => {
    camOn = !camOn;
    render();
  });

  el.close.addEventListener("click", () => {
    if (state === "recording" || state === "paused") {
      chrome.runtime.sendMessage({ type: "vc:stop-recording" });
    }
    clearInterval(timerId);
    root.remove();
  });

  function applyStatus(status) {
    const previousState = state;
    micOn = status.withMic ?? micOn;
    camOn = status.withCamera ?? camOn;
    lastShareUrl = status.shareUrl ?? lastShareUrl;
    savedLocally = Boolean(status.savedLocally);

    switch (status.phase) {
      case "creating":
        state = "starting";
        break;
      case "recording":
        if (state !== "recording") {
          seconds = status.startedAt
            ? Math.max(0, Math.floor((Date.now() - status.startedAt) / 1000))
            : 0;
          startTimer();
        }
        state = "recording";
        break;
      case "paused":
        state = "paused";
        clearInterval(timerId);
        break;
      case "uploading":
        state = "uploading";
        clearInterval(timerId);
        break;
      case "error":
        state = "idle";
        clearInterval(timerId);
        if (status.error) toast(`Recording error: ${status.error}`, true);
        break;
      default:
        state = "idle";
        clearInterval(timerId);
        if (previousState === "uploading" && lastShareUrl) {
          toast("Link ready — opened in a new tab");
        } else if (previousState === "uploading" && savedLocally) {
          toast("Not signed in to Capca — saved as download instead");
        }
        break;
    }

    render();
  }

  chrome.runtime.onMessage.addListener(async (msg) => {
    switch (msg.type) {
      case "vc:status":
        applyStatus(msg.status);
        break;
      case "vc:recording-started":
        await runCountdown();
        state = "recording";
        seconds = 0;
        startTimer();
        render();
        break;
      case "vc:recording-paused":
        state = "paused";
        clearInterval(timerId);
        render();
        break;
      case "vc:recording-resumed":
        state = "recording";
        startTimer();
        render();
        break;
      case "vc:recording-cancelled":
        state = "idle";
        render();
        break;
      case "vc:upload-started":
        state = "uploading";
        render();
        break;
      case "vc:upload-progress":
        if (!el.upload.hidden && typeof msg.uploadedBytes === "number") {
          el.upload.lastChild.textContent = ` Uploading · ${Math.round(msg.uploadedBytes / (1024 * 1024))} MB`;
        }
        break;
      case "vc:upload-complete":
        state = "idle";
        seconds = 0;
        render();
        toast("Link ready — opened in a new tab");
        break;
      case "vc:upload-skipped":
        state = "idle";
        seconds = 0;
        render();
        toast("Not signed in to Capca — saved as download instead");
        break;
      case "vc:recording-error":
        state = "idle";
        render();
        toast(`Recording error: ${msg.error}`, true);
        break;
    }
  });

  function toast(text, isError = false) {
    const t = document.createElement("div");
    t.className = `vc-toast${isError ? " vc-toast-error" : ""}`;
    t.textContent = text;
    root.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function makeDraggable(dragEl, stateKey, canStart = () => true) {
    dragEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !canStart(e)) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = dragEl.getBoundingClientRect();
      let moved = false;

      const move = (ev) => {
        const next = setFixedPosition(dragEl, {
          left: rect.left + (ev.clientX - startX),
          top: rect.top + (ev.clientY - startY),
        });
        moved =
          moved ||
          Math.abs(ev.clientX - startX) > 3 ||
          Math.abs(ev.clientY - startY) > 3;
        if (next) uiState = { ...uiState, [stateKey]: next };
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (moved) {
          void writeUiState(uiState);
          dragEl.dataset.dragged = "true";
          window.setTimeout(() => {
            delete dragEl.dataset.dragged;
          }, 0);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }

  makeDraggable(bubble, "bubble");
  makeDraggable(bar, "bar", (e) => !e.target.closest("button"));
  makeDraggable(restore, "restore");

  render();
  void (async () => {
    uiState = await readUiState();
    setFixedPosition(bubble, uiState.bubble);
    setFixedPosition(bar, uiState.bar);
    setFixedPosition(restore, uiState.restore);
    setToolbarCollapsed(Boolean(uiState.collapsed), {
      persist: false,
      syncRestore: !uiState.restore,
    });
    if (initialStatus) applyStatus(initialStatus);
  })();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "vc:toggle-launcher") {
      toggleLauncher(msg.status ?? null);
      sendResponse?.({ ok: true });
      return;
    }
    if (msg.type === "vc:show-controls") {
      mountControls(msg.status ?? null);
      sendResponse?.({ ok: true });
      return;
    }
    if (msg.type === "vc:hide-controls") {
      removeControls();
      sendResponse?.({ ok: true });
      return;
    }
    if (msg.type === "vc:status" && mounted) {
      mountControls(msg.status);
    }
    if (msg.type === "vc:status") {
      launcher?.applyStatus(msg.status);
    }
    if (msg.type === "vc:upload-progress" && typeof msg.uploadedBytes === "number") {
      launcher?.uploadProgress(msg.uploadedBytes);
    }
  });

  chrome.runtime.sendMessage({ type: "vc:get-status" }, (response) => {
    const status = response?.status;
    if (status && status.phase !== "idle") mountControls(status);
  });
})();
