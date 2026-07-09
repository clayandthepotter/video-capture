// Offscreen document — the recording engine and the source of truth for
// recording state (the service worker can die and resync from here).
//
// Capture model ported from Cap (github.com/CapSoftware/Cap, AGPL-3.0):
// - fullscreen/window: getDisplayMedia() *in this document* with
//   surface-preference hints and a fallback ladder. No chrome.desktopCapture,
//   no streamId origin binding — this is what fixes captures silently binding
//   to the original tab.
// - tab: chrome.tabCapture streamId from the SW, consumed here with
//   chromeMediaSource: "tab".
// - camera: plain getUserMedia.
// - MP4 (H.264/AAC) preferred, WebM fallback.

const DISPLAY_IDEAL = { width: 1920, height: 1080, frameRate: 30 };

const VIDEO_CONSTRAINTS = {
  frameRate: { ideal: DISPLAY_IDEAL.frameRate },
  width: { ideal: DISPLAY_IDEAL.width },
  height: { ideal: DISPLAY_IDEAL.height },
};

const DISPLAY_MODE_PREFERENCES = {
  fullscreen: {
    monitorTypeSurfaces: "include",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "exclude",
    preferCurrentTab: false,
  },
  window: {
    monitorTypeSurfaces: "exclude",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "exclude",
    preferCurrentTab: false,
  },
};

const MP4_MIME_TYPES = {
  withAudio: [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs="avc1.4d401e,mp4a.40.2"',
  ],
  videoOnly: ['video/mp4;codecs="avc1.42E01E"', "video/mp4"],
};
const WEBM_MIME_TYPES = {
  withAudio: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus"],
  videoOnly: ["video/webm;codecs=vp9", "video/webm"],
};

let active = null; // { recorder, streams, micStream, audioCtx, chunks, startedAt, pausedMs, pausedAt }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "vc:offscreen-start":
      void start(msg);
      break;
    case "vc:offscreen-stop-recording":
      stop();
      break;
    case "vc:offscreen-pause-recording":
      if (active?.recorder.state === "recording") {
        active.recorder.pause();
        active.pausedAt = Date.now();
        chrome.runtime.sendMessage({ type: "vc:recording-paused" });
      }
      break;
    case "vc:offscreen-resume-recording":
      if (active?.recorder.state === "paused") {
        active.recorder.resume();
        if (active.pausedAt) active.pausedMs += Date.now() - active.pausedAt;
        active.pausedAt = null;
        chrome.runtime.sendMessage({ type: "vc:recording-resumed" });
      }
      break;
    case "vc:offscreen-set-mic":
      active?.micStream?.getAudioTracks().forEach((t) => (t.enabled = msg.enabled));
      break;
    case "vc:offscreen-get-status":
      sendResponse({ status: currentStatus() });
      break;
  }
});

function currentStatus() {
  if (!active) return { phase: "idle" };
  return {
    phase: active.recorder.state === "paused" ? "paused" : "recording",
    startedAt: active.startedAt,
  };
}

function isUserCancellation(err) {
  return err?.name === "NotAllowedError" || err?.name === "AbortError";
}

async function getDisplayStream(mode, includeAudio) {
  const preferences = DISPLAY_MODE_PREFERENCES[mode] ?? {};
  const video = VIDEO_CONSTRAINTS;
  const audio = includeAudio
    ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false,
      }
    : false;
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      ...preferences,
      video,
      audio,
      systemAudio: "include",
      windowAudio: "system",
    });
  } catch (err) {
    if (isUserCancellation(err)) throw err;
    // Fallback ladder (from Cap): some platforms reject the advanced surface
    // preferences or the audio request — degrade instead of failing.
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video, audio });
    } catch (retryErr) {
      if (isUserCancellation(retryErr)) throw retryErr;
      if (includeAudio) {
        return navigator.mediaDevices.getDisplayMedia({ video, audio: false });
      }
      throw retryErr;
    }
  }
}

function getTabStream(streamId, includeAudio) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId },
    },
    audio: includeAudio
      ? {
          mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      : false,
  });
}

function getMainStream(mode, tabStreamId) {
  if (mode === "tab") {
    if (!tabStreamId) throw new Error("Tab stream id is missing");
    return getTabStream(tabStreamId, true);
  }
  if (mode === "camera") {
    return navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  }
  return getDisplayStream(mode, true);
}

function pickMimeType(hasAudio) {
  const ladders = hasAudio
    ? [...MP4_MIME_TYPES.withAudio, ...WEBM_MIME_TYPES.withAudio]
    : [...MP4_MIME_TYPES.videoOnly, ...WEBM_MIME_TYPES.videoOnly];
  for (const mime of ladders) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

async function start({ mode, withMic, tabStreamId }) {
  console.log("[capca] offscreen start", { mode, withMic });
  let step = "capture";
  try {
    const main = await getMainStream(mode, tabStreamId);

    step = "microphone";
    let micStream = null;
    if (withMic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        console.warn("[capca] mic unavailable, recording without it:", err?.message);
      }
    }

    step = "set up recorder";
    const output = new MediaStream(main.getVideoTracks());
    const streams = [main];
    if (micStream) streams.push(micStream);

    let audioCtx = null;
    const audioSources = [main, micStream].filter(
      (s) => s && s.getAudioTracks().length > 0,
    );
    if (audioSources.length > 0) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      for (const s of audioSources) {
        const source = audioCtx.createMediaStreamSource(s);
        source.connect(dest);
        // Chrome mutes tab playback while tabCapture is active unless the
        // extension explicitly routes it back to the speakers.
        if (s === main && mode === "tab") source.connect(audioCtx.destination);
      }
      dest.stream.getAudioTracks().forEach((t) => output.addTrack(t));
    }

    // The user hit the browser's own "Stop sharing" affordance, closed the
    // captured window, or the captured tab went away.
    main.getVideoTracks()[0].addEventListener("ended", stop);

    const mimeType = pickMimeType(output.getAudioTracks().length > 0);
    console.log("[capca] recording as", mimeType || "(browser default)");
    const chunks = [];
    const recorder = new MediaRecorder(output, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 8_000_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const session = active;
      active = null;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const durationSec =
        (Date.now() - session.startedAt - session.pausedMs) / 1000;
      chrome.runtime.sendMessage({
        type: "vc:recording-complete",
        blobUrl: URL.createObjectURL(blob),
        mimeType: recorder.mimeType,
        durationSec,
      });
      cleanup(session);
    };

    recorder.start(1000);
    active = {
      recorder,
      streams,
      micStream,
      audioCtx,
      chunks,
      startedAt: Date.now(),
      pausedMs: 0,
      pausedAt: null,
    };
    chrome.runtime.sendMessage({ type: "vc:recording-started" });
  } catch (err) {
    if (isUserCancellation(err)) {
      chrome.runtime.sendMessage({ type: "vc:recording-cancelled" });
      return;
    }
    console.error("[capca] start failed at", step, err);
    chrome.runtime.sendMessage({
      type: "vc:recording-error",
      error: `${step}: ${err?.message ?? String(err)}`,
    });
  }
}

function stop() {
  if (active && active.recorder.state !== "inactive") {
    if (active.pausedAt) active.pausedMs += Date.now() - active.pausedAt;
    active.recorder.stop();
  }
}

function cleanup(session) {
  session.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  session.audioCtx?.close();
}
