// Preloaded on normal web pages so the background/popup can show controls on
// demand. It must stay passive on page load: mounting the bubble creates a
// camera iframe, which makes Chrome mark every tab as recording.

(() => {
  if (window.__capcaContentLoaded) return;
  window.__capcaContentLoaded = true;

  let mounted = false;

  function removeControls() {
    document.getElementById("__vc_root")?.remove();
    mounted = false;
  }

  function mountControls(initialStatus = null) {
    const existing = document.getElementById("__vc_root");
    if (existing) return;
    mounted = true;

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
  let selectedMode = initialStatus?.mode ?? "tab";
  let lastShareUrl = null;
  let savedLocally = false;
  let micOn = initialStatus?.withMic ?? true;
  let camOn = initialStatus?.withCamera ?? true;
  let seconds = 0;
  let timerId = null;

  const root = document.createElement("div");
  root.id = "__vc_root";

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
    <span class="vc-brand"><span class="vc-brand-dot"></span></span>
    <button class="vc-btn vc-btn-primary" data-action="record">${SVG.record}<span>Record</span></button>
    <button class="vc-btn vc-btn-icon" data-action="pause" title="Pause" hidden>${SVG.pause}</button>
    <span class="vc-timer" hidden>0:00</span>
    <button class="vc-btn vc-btn-icon" data-action="mic" title="Toggle microphone">${SVG.mic}</button>
    <button class="vc-btn vc-btn-icon" data-action="camera" title="Toggle camera">${SVG.cam}</button>
    <span class="vc-divider"></span>
    <button class="vc-btn vc-btn-icon vc-btn-ghost" data-action="close" title="Close">${SVG.close}</button>
  `;

  const countdown = document.createElement("div");
  countdown.className = "vc-countdown";
  countdown.hidden = true;

  root.append(bubble, bar, countdown);
  document.documentElement.appendChild(root);

  const el = {
    record: bar.querySelector('[data-action="record"]'),
    pause: bar.querySelector('[data-action="pause"]'),
    mic: bar.querySelector('[data-action="mic"]'),
    camera: bar.querySelector('[data-action="camera"]'),
    close: bar.querySelector('[data-action="close"]'),
    timer: bar.querySelector(".vc-timer"),
  };

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

    if (state === "recording" || state === "paused") {
      el.record.innerHTML = `${SVG.stop}<span>Stop</span>`;
      el.record.className = "vc-btn vc-btn-danger";
    } else if (state === "uploading") {
      el.record.innerHTML = `<span class="vc-spinner"></span><span>Uploading…</span>`;
      el.record.className = "vc-btn vc-btn-primary";
    } else if (state === "starting") {
      el.record.innerHTML = `<span>…</span>`;
      el.record.className = "vc-btn vc-btn-primary";
    } else {
      el.record.innerHTML = `${SVG.record}<span>Record</span>`;
      el.record.className = "vc-btn vc-btn-primary";
    }
    el.record.disabled = state === "starting" || state === "uploading";
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
    if (state === "idle") {
      state = "starting";
      render();
      chrome.runtime.sendMessage({
        type: "vc:start-recording",
        mode: selectedMode,
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
    selectedMode = status.mode ?? selectedMode;
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

  // --- dragging (bubble and bar share the logic) ---
  for (const dragEl of [bubble, bar]) {
    dragEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = dragEl.getBoundingClientRect();
      const move = (ev) => {
        dragEl.style.left = `${rect.left + (ev.clientX - startX)}px`;
        dragEl.style.top = `${rect.top + (ev.clientY - startY)}px`;
        dragEl.style.right = "auto";
        dragEl.style.bottom = "auto";
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }

  render();
  if (initialStatus) applyStatus(initialStatus);
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
