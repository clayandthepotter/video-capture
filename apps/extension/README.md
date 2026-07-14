# @capca/extension

Capca's Chrome MV3 extension — the flagship recording surface. No build step —
load the folder directly.

Features: camera bubble on the page you're recording, 3-2-1 countdown, timer,
pause/resume, mic toggle, and automatic upload — if you're signed in to Capca
in this browser, stopping a recording uploads it and opens the share link;
otherwise it saves as a download.

## Install (dev)

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this folder (`apps/extension`)
3. Pin the extension and click it on any normal page (not `chrome://` pages)
4. Start recording and choose what to share in Chrome's native picker

For Google Meet and other browser-based meetings, choose the meeting tab in
Chrome's picker and keep **Also share tab audio** enabled. The extension does
not ask for a capture mode separately; Chrome's picker is the source of truth.

## How it works

- **popup.html / popup.js / popup.css** — the toolbar popup. Starts/stops
  recording without duplicating Chrome's capture-mode picker.
- **background.js** — service worker. Coordinates the popup, page controls, and
  offscreen recorder; it also owns the extension status badge.
- **content.js / content.css** — passive page script until the popup/background
  asks it to show the draggable camera bubble + control bar. The bubble is page
  DOM, so tab/page captures can record it without server-side compositing.
- **bubble.html / bubble.js** — the camera view inside the bubble. It's an
  iframe on the extension origin so camera+mic permission is granted once for
  the extension instead of per-site.
- **offscreen.html / offscreen.js** — MediaRecorder lives here (MV3 service
  workers have no DOM/media APIs). Uses Chrome's native `getDisplayMedia`
  picker, preserves native audio tracks when possible, uses a low-latency
  mixer only when display/tab audio and mic both need to be combined, routes
  captured tab audio back to local playback, prefers WebM/Opus for stable
  capture timestamps, and keeps MP4 as a fallback.
- **bubble.html / bubble.js** shows the live presenter-camera feed without an
  artificial delay, because the page-rendered bubble is captured as video while
  mic audio is captured separately in the offscreen recorder.

## Known gaps

- Upload targets are hardcoded in `background.js` (`API_BASES`) — localhost
  and capca-cam.vercel.app. A settings page for custom self-hosted domains is TODO.
- Picking the same tab you're on records the bubble (intended); picking a
  different window records that window but the bubble stays on the original tab.
