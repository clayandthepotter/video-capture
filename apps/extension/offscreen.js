// Offscreen document — the recording engine and the source of truth for
// recording state (the service worker can die and resync from here).
//
// Capture model ported from Cap (github.com/CapSoftware/Cap, AGPL-3.0):
// - capture: getDisplayMedia() *in this document* so Chrome's native picker is
//   the only source of truth for tab/window/screen choice. No tabCapture stream
//   ids, no activeTab grant dependency between recordings.
// - camera bubble: preview iframe in the captured page; mic is captured here.
// - MP4 (H.264/AAC) preferred, WebM fallback.
// - Instant sharing: chunks stream to storage as S3 multipart parts WHILE
//   recording, so stopping only has to flush the tail and complete the upload.
//   Uploads are independent of the recorder — a new recording can start while
//   the previous one finishes uploading.

const API_BASES = ["http://localhost:3000", "https://capca-cam.vercel.app"];

const DISPLAY_IDEAL = { width: 1920, height: 1080, frameRate: 30 };

const VIDEO_CONSTRAINTS = {
  frameRate: { ideal: DISPLAY_IDEAL.frameRate },
  width: { ideal: DISPLAY_IDEAL.width },
  height: { ideal: DISPLAY_IDEAL.height },
};

// Screen content compresses extremely well; 3 Mbps keeps hour-long recordings
// small enough to stream up in real time on ordinary connections.
const VIDEO_BITS_PER_SECOND = 3_000_000;

// S3 multipart parts must be >= 5 MiB (except the last); buffer to 8 MiB.
const PART_SIZE = 8 * 1024 * 1024;
// Local safety copy cap. MediaRecorder chunks are Blobs, which Chrome backs
// with disk storage — keeping them does not pin the recording in RAM.
const LOCAL_BACKUP_MAX_BYTES = 4 * 1024 * 1024 * 1024;

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

let active = null; // { recorder, streams, micStream, audioCtx, audioNodes, uploader, keepLocalCopy, startedAt, pausedMs, pausedAt }
let uploadsInFlight = 0;
let pendingLocalSaves = new Map(); // blobUrl -> true (kept alive until the download drains)

/**
 * Streams MediaRecorder chunks to the Capca API as multipart parts during the
 * recording. Keeps a capped local copy so an upload failure can still fall
 * back to a local download.
 */
class InstantUploader {
  constructor(mimeType, title, keepLocalCopy) {
    this.mimeType = mimeType;
    this.title = title;
    this.keepLocalCopy = keepLocalCopy;
    this.uploadedBytes = 0;
    this.ready = false; // API session established, streaming enabled
    this.failed = false;
    this.base = null;
    this.id = null;
    this.uploadId = null;
    this.shareUrl = null;
    this.parts = []; // { partNumber, etag }
    this.nextPartNumber = 1;
    this.chain = Promise.resolve();
    this.buffer = [];
    this.bufferBytes = 0;
    this.totalBytes = 0;
    this.local = [];
    this.localBytes = 0;
    this.localDropped = false;
    this.initPromise = this.#init();
  }

  async #init() {
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}/api/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: this.title,
            mimeType: this.mimeType,
            multipart: true,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        this.base = base;
        this.id = data.id;
        this.uploadId = data.uploadId;
        this.shareUrl = `${base}${data.shareUrl}`;
        this.ready = true;
        console.log("[capca] instant upload ready:", this.shareUrl);
        this.#maybeFlush(false);
        return;
      } catch {
        // API unreachable — try the next base.
      }
    }
    this.failed = true; // signed out or offline: record locally, download on stop
    console.warn("[capca] no API session — will fall back to local download");
  }

  add(chunk) {
    this.buffer.push(chunk);
    this.bufferBytes += chunk.size;
    this.totalBytes += chunk.size;
    if (!this.localDropped) {
      this.local.push(chunk);
      this.localBytes += chunk.size;
      // The safety copy is never dropped when the user asked for a local
      // file; otherwise it's capped as a fallback-only buffer.
      if (!this.keepLocalCopy && this.localBytes > LOCAL_BACKUP_MAX_BYTES) {
        this.local = [];
        this.localBytes = 0;
        this.localDropped = true;
      }
    }
    this.#maybeFlush(false);
  }

  #maybeFlush(isLast) {
    if (!this.ready || this.failed) return;
    if (!isLast && this.bufferBytes < PART_SIZE) return;
    if (this.buffer.length === 0) return;
    const part = new Blob(this.buffer, { type: this.mimeType });
    this.buffer = [];
    this.bufferBytes = 0;
    const partNumber = this.nextPartNumber++;
    this.chain = this.chain.then(() => this.#uploadPart(part, partNumber));
  }

  async #uploadPart(blob, partNumber, attempt = 1) {
    if (this.failed) return;
    try {
      const signed = await fetch(
        `${this.base}/api/recordings/${this.id}/parts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ uploadId: this.uploadId, partNumber }),
        },
      );
      if (!signed.ok) throw new Error(`sign part: ${signed.status}`);
      const { url } = await signed.json();
      const put = await fetch(url, { method: "PUT", body: blob });
      if (!put.ok) throw new Error(`put part: ${put.status}`);
      const etag = put.headers.get("ETag");
      if (!etag) throw new Error("no ETag on part response");
      this.parts.push({ partNumber, etag });
      this.uploadedBytes += blob.size;
      chrome.runtime.sendMessage({
        type: "vc:upload-progress",
        uploadedBytes: this.uploadedBytes,
      }).catch?.(() => {});
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        return this.#uploadPart(blob, partNumber, attempt + 1);
      }
      console.error("[capca] part upload failed permanently:", err);
      this.failed = true;
    }
  }

  /** Returns { shareUrl } on success, or { fallbackBlob } when streaming
   * failed but the local copy is intact, or { lost: true } as the worst case. */
  async finalize(durationSec) {
    await this.initPromise;
    if (this.ready && !this.failed) {
      this.#maybeFlush(true);
      await this.chain;
    }
    if (this.ready && !this.failed && this.parts.length > 0) {
      try {
        const res = await fetch(
          `${this.base}/api/recordings/${this.id}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              uploadId: this.uploadId,
              parts: this.parts,
              sizeBytes: this.totalBytes,
              durationSec,
            }),
          },
        );
        if (!res.ok) throw new Error(`complete: ${res.status}`);
        return { shareUrl: this.shareUrl };
      } catch (err) {
        console.error("[capca] complete failed:", err);
        this.failed = true;
      }
    }

    // Streaming didn't work out — clean up the server side and fall back.
    if (this.id && this.base) {
      void fetch(`${this.base}/api/recordings/${this.id}/abort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uploadId: this.uploadId }),
      }).catch(() => {});
    }
    if (!this.localDropped) {
      const all = [...this.local, ...this.buffer];
      return { fallbackBlob: new Blob(all, { type: this.mimeType }) };
    }
    return { lost: true };
  }

  discardLocal() {
    this.local = [];
    this.localBytes = 0;
  }
}

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
    case "vc:offscreen-local-saved":
      // The SW confirmed the download drained — safe to release the blob.
      if (pendingLocalSaves.delete(msg.blobUrl)) {
        URL.revokeObjectURL(msg.blobUrl);
      }
      break;
  }
});

function currentStatus() {
  if (!active) {
    return uploadsInFlight > 0 || pendingLocalSaves.size > 0
      ? { phase: "uploading" }
      : { phase: "idle" };
  }
  return {
    phase: active.recorder.state === "paused" ? "paused" : "recording",
    startedAt: active.startedAt,
  };
}

function occupancy() {
  return { recording: !!active, uploads: uploadsInFlight };
}

function isUserCancellation(err) {
  return err?.name === "NotAllowedError" || err?.name === "AbortError";
}

async function getDisplayStream(includeAudio) {
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
      video,
      audio,
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
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

function pickMimeType(hasAudio) {
  const ladders = hasAudio
    ? [...MP4_MIME_TYPES.withAudio, ...WEBM_MIME_TYPES.withAudio]
    : [...MP4_MIME_TYPES.videoOnly, ...WEBM_MIME_TYPES.videoOnly];
  for (const mime of ladders) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

async function start({ withMic, keepLocalCopy }) {
  console.log("[capca] offscreen start", { withMic, keepLocalCopy });
  if (active) {
    chrome.runtime.sendMessage({
      type: "vc:recording-error",
      error: "A recording is already in progress",
    });
    return;
  }
  let step = "capture";
  try {
    const main = await getDisplayStream(true);
    const displaySurface = main.getVideoTracks()[0]?.getSettings().displaySurface;

    step = "microphone";
    let micStream = null;
    if (withMic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          },
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
    const audioNodes = [];
    const audioSources = [main, micStream].filter(
      (s) => s && s.getAudioTracks().length > 0,
    );
    if (audioSources.length === 1) {
      audioSources[0].getAudioTracks().forEach((t) => output.addTrack(t));

      // Keep tab audio audible locally without routing the recorded track
      // through Web Audio, which can add delay relative to the video track.
      if (audioSources[0] === main && displaySurface === "browser") {
        audioCtx = new AudioContext({ latencyHint: "interactive" });
        const source = audioCtx.createMediaStreamSource(main);
        source.connect(audioCtx.destination);
        audioNodes.push(source);
      }
    } else if (audioSources.length > 1) {
      audioCtx = new AudioContext({ latencyHint: "interactive" });
      const dest = audioCtx.createMediaStreamDestination();
      for (const s of audioSources) {
        const source = audioCtx.createMediaStreamSource(s);
        source.connect(dest);
        audioNodes.push(source);
        // Chrome may mute captured tab playback unless the extension explicitly
        // routes browser-surface audio back to the speakers.
        if (s === main && displaySurface === "browser") {
          source.connect(audioCtx.destination);
        }
      }
      dest.stream.getAudioTracks().forEach((t) => output.addTrack(t));
      audioNodes.push(dest);
    }

    // The user hit the browser's own "Stop sharing" affordance, closed the
    // captured window, or the captured tab went away.
    main.getVideoTracks()[0].addEventListener("ended", stop);

    const mimeType = pickMimeType(output.getAudioTracks().length > 0);
    console.log("[capca] recording as", mimeType || "(browser default)");

    const recorder = new MediaRecorder(output, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });

    // Start streaming the upload immediately — the share link exists before
    // the first frame is captured.
    const uploader = new InstantUploader(
      recorder.mimeType || mimeType || "video/webm",
      `Recording ${new Date().toLocaleString()}`,
      Boolean(keepLocalCopy),
    );

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) uploader.add(e.data);
    };
    recorder.onstop = () => {
      const session = active;
      active = null;
      void finishRecording(session);
    };

    recorder.start(1000);
    active = {
      recorder,
      streams,
      micStream,
      audioCtx,
      audioNodes,
      uploader,
      startedAt: Date.now(),
      pausedMs: 0,
      pausedAt: null,
    };
    chrome.runtime.sendMessage({ type: "vc:recording-started" });
  } catch (err) {
    if (isUserCancellation(err)) {
      chrome.runtime.sendMessage({
        type: "vc:recording-cancelled",
        ...occupancy(),
      });
      return;
    }
    console.error("[capca] start failed at", step, err);
    chrome.runtime.sendMessage({
      type: "vc:recording-error",
      error: `${step}: ${err?.message ?? String(err)}`,
      ...occupancy(),
    });
  }
}

async function finishRecording(session) {
  uploadsInFlight += 1;
  const durationSec =
    (Date.now() - session.startedAt - session.pausedMs) / 1000;
  cleanup(session);
  chrome.runtime.sendMessage({ type: "vc:upload-finalizing", ...occupancy() });

  try {
    const result = await session.uploader.finalize(durationSec);
    uploadsInFlight -= 1;

    // "Always save a local copy": download regardless of upload outcome —
    // unless the fallback path below is already downloading the same bytes.
    if (
      session.uploader.keepLocalCopy &&
      !session.uploader.localDropped &&
      !result.fallbackBlob
    ) {
      const localBlob = new Blob(
        [...session.uploader.local, ...session.uploader.buffer],
        { type: session.uploader.mimeType },
      );
      if (localBlob.size > 0) {
        const blobUrl = URL.createObjectURL(localBlob);
        pendingLocalSaves.set(blobUrl, true);
        chrome.runtime.sendMessage({
          type: "vc:save-local-copy",
          blobUrl,
          mimeType: session.uploader.mimeType,
          title: session.uploader.title,
        });
      }
    }

    if (result.shareUrl) {
      session.uploader.discardLocal();
      chrome.runtime.sendMessage({
        type: "vc:upload-finalized",
        shareUrl: result.shareUrl,
        ...occupancy(),
      });
    } else if (result.fallbackBlob) {
      chrome.runtime.sendMessage({
        type: "vc:recording-complete",
        blobUrl: URL.createObjectURL(result.fallbackBlob),
        mimeType: result.fallbackBlob.type,
        durationSec,
        ...occupancy(),
      });
    } else {
      chrome.runtime.sendMessage({
        type: "vc:recording-error",
        error:
          "The upload failed and the recording exceeded the local backup limit.",
        ...occupancy(),
      });
    }
  } catch (err) {
    uploadsInFlight -= 1;
    chrome.runtime.sendMessage({
      type: "vc:recording-error",
      error: `finalize: ${err?.message ?? String(err)}`,
      ...occupancy(),
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
