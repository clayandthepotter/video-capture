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
  const UI_STATE_KEY = "capca:ui-state:v1";

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
  });

  chrome.runtime.sendMessage({ type: "vc:get-status" }, (response) => {
    const status = response?.status;
    if (status && status.phase !== "idle") mountControls(status);
  });
})();
