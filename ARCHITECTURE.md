# Architecture

An open source, web-first alternative to Loom: record your screen with a camera
bubble and mic audio, get a shareable link. Inspired by
[Cap](https://github.com/CapSoftware/Cap), but with the priorities inverted —
Cap is desktop-native-first (Rust/Tauri); we are **web + Chrome extension
first**, desktop later.

## Product shape (bare-bones Loom)

1. **Record**: screen (tab / window / full screen) + presenter camera bubble +
   microphone. System audio when the platform allows it (Chrome exposes tab and
   screen audio via `getDisplayMedia`).
2. **Share**: recording uploads to object storage; a share link plays it on a
   public page.
3. **Chrome extension**: one-click recording from any page, Loom-style draggable
   camera bubble injected into the page.

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Capture engine | Browser APIs (`getDisplayMedia`, `getUserMedia`, `MediaRecorder`) | Web-first mandate. No native code needed for v0; ships everywhere Chrome runs. Trade-off vs Cap's Rust pipeline: less quality control, no 4K60 guarantees — acceptable for bare-bones Loom parity. |
| Compositing | Camera bubble is a **DOM overlay**, captured two ways: web recorder composites screen + camera onto a `<canvas>` and records `canvas.captureStream()`; the extension renders the bubble into the page so it is simply part of the captured screen (Loom's trick). | Single output file, no server-side compositing. |
| Container | WebM (VP9/VP8 + Opus) from MediaRecorder | Only format MediaRecorder emits reliably. Server-side transcode to MP4 is a later concern (ffmpeg worker). |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) | Same layout as Cap, minus Turborepo until build times justify it. |
| Web app | Next.js (App Router) + Tailwind | Handles marketing, recorder, dashboard, share pages, and API routes in one deployable. |
| Extension | Manifest V3, no bundler | Background service worker + offscreen document (MediaRecorder can't run in a service worker) + content-script bubble. Plain JS keeps it loadable via chrome://extensions with zero build step. |
| Database | Postgres + Drizzle ORM | Drizzle matches Cap; Postgres over MySQL as the friendlier open-source-SaaS default. Dev instance via docker-compose on host port 5433 (5432 often taken by a native install). |
| Auth | Better Auth (email + password) | Self-hostable, no vendor lock-in. |
| Storage | S3-compatible (R2 / MinIO / S3), presigned uploads | Same self-hosting story as Cap: users can point at their own bucket. Client PUTs directly to a presigned URL, so video bytes never pass through the Next.js server. |
| License | AGPL-3.0 | Cap's model: keeps hosted forks honest while the code stays open. |

## Repo layout

```
apps/
  web/         Next.js app — landing, /record recorder, later: auth, dashboard, /s/[id] share pages
  extension/   Chrome MV3 extension — record any page with an injected camera bubble
packages/      (future) shared db schema, ui, sdk
```

## How recording works

### Web recorder (`apps/web` → `/record`)

```
getDisplayMedia (screen video [+ system/tab audio])
getUserMedia    (camera video + mic audio)
        │
        ▼
<canvas> compositor — draws screen frame + circular camera bubble each rAF
        │                                AudioContext mixes mic + display audio
        ▼                                        │
canvas.captureStream(30) ◄───────────────────────┘  (audio track added)
        │
        ▼
MediaRecorder (video/webm) → chunks → Blob → preview + download (later: multipart upload)
```

### Chrome extension (`apps/extension`)

```
toolbar click → background SW injects content script → draggable bubble UI in page
"start" → background: chrome.desktopCapture.chooseDesktopMedia → streamId
        → offscreen document: getUserMedia({chromeMediaSource:'desktop'}) + mic
        → MediaRecorder in offscreen doc
"stop"  → Blob URL → chrome.downloads (later: upload to API)
```

The bubble lives in the page DOM, so the screen capture picks it up naturally —
no compositing needed in the extension path.

## Roadmap

- **P0 — local recorder ✅**: web `/record` page and extension record screen +
  bubble + mic to a downloadable WebM. No accounts, no server.
- **P1 — SaaS core ✅**: Better Auth (email/password), Postgres + Drizzle,
  presigned uploads to S3-compatible storage, `/s/[id]` share pages, dashboard.
  Flow: `POST /api/recordings` → presigned PUT → `PATCH` marks it ready.
- **P2 — polish**: upload chunks *while recording* (Loom/Cap "instant"
  behavior — MediaRecorder's `dataavailable` chunks map onto multipart upload
  parts), WebM duration fix (seekable metadata), server-side MP4 transcode +
  thumbnails (ffmpeg worker), share-page comments/view counts, extension
  uploads to the API instead of downloading.
- **P3 — desktop (Windows first)**: Tauri + Rust capture
  (Windows.Graphics.Capture + MediaFoundation), reusing the web app for
  auth/sharing. This is where Cap's crate decomposition becomes the reference.
