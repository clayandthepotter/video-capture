# @video-capture/extension

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
4. Choose a capture mode in the popup and start recording

For Google Meet and other browser-based meetings, use **Current tab with
audio**. Screen/window capture depends on Chrome's display picker granting
shared audio, which is not reliable for every surface.

## How it works

- **popup.html / popup.js / popup.css** — the toolbar popup. Lets the user pick
  capture mode and start/stop recording without injecting UI on every tab.
- **background.js** — service worker. Coordinates the popup, page controls, and
  offscreen recorder; it also owns the extension status badge.
- **content.js / content.css** — passive page script until the popup/background
  asks it to show the draggable camera bubble + control bar. The bubble is page
  DOM, so tab/page captures can record it without server-side compositing.
- **bubble.html / bubble.js** — the camera view inside the bubble. It's an
  iframe on the extension origin so camera+mic permission is granted once for
  the extension instead of per-site.
- **offscreen.html / offscreen.js** — MediaRecorder lives here (MV3 service
  workers have no DOM/media APIs). Mixes display/tab audio + mic, routes
  captured tab audio back to local playback, records MP4 when Chrome supports it
  and WebM as fallback, then returns a blob URL.

## Known gaps

- Upload targets are hardcoded in `background.js` (`API_BASES`) — localhost
  and capca-cam.vercel.app. A settings page for custom self-hosted domains is TODO.
- Picking the same tab you're on records the bubble (intended); picking a
  different window records that window but the bubble stays on the original tab.
