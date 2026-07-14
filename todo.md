# Todo

Updated: 2026-07-14

## In Progress

- [ ] Stabilize the Chrome extension refactor so manifest, popup/control UI,
  content script, background status machine, and offscreen recorder agree.
- [ ] Verify the current web record/upload/share/delete loop against local
  Postgres + MinIO.
- [ ] Define the Google Drive-backed free tier implementation plan for
  unlimited user-owned recordings.
- [ ] Enforce Capca brand QA on every new page, extension surface, and state
  before it is considered complete.

## Next

- [ ] Add billing gates for Capca-cost features: hosted video storage, proxied
  streaming bandwidth, AI processing Capca pays for, team administration, and
  automation.
- [ ] Add Google OAuth and Drive connection state for free-tier recording
  exports.
- [ ] Implement Drive resumable uploads with persisted session URI, byte
  offsets, MIME type, Drive file id, and retry/recovery states.
- [ ] Add Drive-backed share pages with explicit Drive file ownership, link
  permission state, and source-file actions.
- [ ] Add extension smoke tests for start, cancel, stop, upload fallback, and
  service-worker restart resync.
- [ ] Make storage object keys respect actual recording format instead of always
  using `.webm`.
- [ ] Add upload-while-recording with resumable local chunk recovery.
- [ ] Add share-page comments, viewer activity, password links, and expiring
  links.
- [ ] Add transcript, summary, and chapter generation after upload.
- [ ] Add thumbnails and Open Graph previews for shared recordings.
- [ ] Add workspace/team model once the individual workflow is reliable.

## Done

- [x] Made Capca Cloud share-page video playback more reliably seekable by
  serving byte-range media responses directly instead of redirecting to signed
  storage URLs.
- [x] Fixed Capca Cloud multipart completion failures by uploading fixed-size
  non-final R2 parts instead of variable MediaRecorder chunk aggregates and
  returning structured storage-finalization errors from the complete endpoint.
- [x] Cached extension account state so reopening the launcher or fallback popup
  can show the last known signed-in state immediately while the live server
  refresh completes, and cleared that cache on app sign-out.
- [x] Fixed Capca Cloud plus local-copy recordings so production cloud upload is
  attempted first, cloud failures preserve a failed dashboard row when possible,
  and fallback local saves explain that the cloud upload failed.
- [x] Fixed the remaining severe extension audio/video delay risk by removing
  the artificial presenter-camera delay, switching the bubble back to live
  video rendering, and preferring WebM/Opus recording before MP4.
- [x] Replaced the homepage recorder demo's personal signed-in example with a
  neutral sample user name.
- [x] Replaced the marketing recorder image with an interactive widget that
  matches the extension launcher controls and visual states, including
  destination switching, local-copy state, recording controls, and a preview
  surface.
- [x] Kept recording controls and the presenter bubble synced onto the active
  tab when switching tabs, loading a new active tab, or focusing another
  browser window during an active recording.
- [x] Reduced recording audio/video sync drift by delaying the presenter-bubble
  video slightly to align with separately captured mic audio, preserving native
  audio tracks when possible, and minimizing Web Audio mixer latency.
- [x] Fixed Google Drive recording library actions so Drive exports show
  "View in Google Drive" when a Drive web link or file id is available, and
  requested Drive `webViewLink` metadata for future resumable uploads.
- [x] Set up Google Drive OAuth capability for production: verified Drive API
  enabled, refreshed Google OAuth credentials in Vercel Production, redeployed
  `capca-cam.vercel.app`, and confirmed the dashboard shows Drive connected to
  "Capca Recordings".
- [x] Standardized Capca logo references across web app pages, favicon-aligned
  SVG assets, dashboard, auth surfaces, share pages, and extension UI.
- [x] Allowed trusted same-email OAuth account linking across email, Google,
  and GitHub sign-in, kept OAuth failures on the auth screen, and configured
  GitHub OAuth credentials in Vercel Production.
- [x] Created the production GitHub OAuth app shell for Capca; client secret
  generation was completed after GitHub sudo-mode mobile approval.
- [x] Added Google OAuth client id/secret to the Vercel Production environment
  for `capca` and redeployed production so Google sign-in is registered on
  `capca-cam.vercel.app`.
- [x] Loaded provided local Google OAuth credentials for auth/Drive when env
  vars are absent, made extension account identity fall back to the persisted
  user profile, and removed the `Capca user` placeholder from signed-in
  display names.
- [x] Showed signed-in identity in the extension, prompted signed-out users to
  sign in for sharing, showed Dashboard instead of Sign in on the homepage when
  authenticated, and exposed sign out in the dashboard shell.
- [x] Gated extension sharing behind sign-in and forced signed-out recordings
  to local-only downloads with no dashboard/cloud record.
- [x] Moved the primary extension launcher from Chrome's native popup to a
  rounded content-script overlay triggered by the extension icon, with a
  fallback popup window for restricted pages.
- [x] Reviewed the public rounded-popup example repo and confirmed it uses
  `chrome.action.onClicked` plus `chrome.scripting.executeScript` to inject a
  fixed page overlay instead of using Chrome's native `default_popup`.
- [x] Reviewed Chrome content-script and Declarative Shadow DOM docs and
  verified that true Loom-style outside popup rounding requires an injected
  page overlay, not the native Chrome action popup.
- [x] Rounded the Chrome extension popup surface, switched the destination
  picker from a native select to a Capca-styled menu, and kept unavailable
  Google Drive state visible in the menu.
- [x] Moved the in-page recording controls below the camera bubble by default.
- [x] Persisted extension bubble position, toolbar position, minimized toolbar
  position, and collapsed state across tabs.
- [x] Made the minimized Capca control draggable while preserving
  click-to-restore behavior.
- [x] Reduced extension audio/video drift by preserving the original audio track
  when only one audio source is recorded and only using Web Audio mixing when
  mic and captured tab/system audio both need to be combined.
- [x] Aligned the active web app and extension interfaces to the Capca brand
  system: light Drive-first web surfaces, blue trust accent, neutral structure,
  and consistent ownership/status language.
- [x] Added an explicit design-system rule that every page, popup, toolbar,
  empty state, loading state, and future product surface must match the Capca
  branding style.
- [x] Started the Drive-first UI redesign by replacing the old dark/S3-focused
  landing page with a calm light homepage centered on recording, Drive
  ownership, status visibility, and paid boundaries.
- [x] Moved private product research into `_docs/`, added `_docs/` to
  `.gitignore`, and created public roadmap/design docs in `docs/`.
- [x] Captured the product rule that Capca-cost features must be paid, quotaed,
  or bring-your-own-provider.
- [x] Scraped Loom, Bluedot, and Cap public pages and reviewed the competitor
  screenshot folder to produce `docs/COMPETITIVE-ANALYSIS.md`.
- [x] Decided the first competitive wedge: unlimited free recordings exported
  to the user's Google Drive, with Capca metadata and polished share pages.
- [x] Updated project metadata, documentation, local dev defaults, and app links
  after renaming the GitHub repo to `capca`.
- [x] Rewrote the root README for clearer open-source onboarding, local setup,
  extension usage, troubleshooting, and contribution guidance.
- [x] Removed the redundant extension capture-mode dropdown; Chrome's native
  picker now determines tab/window/screen capture.
- [x] Removed the `tabCapture` dependency that caused repeat recordings on the
  same tab to fail with activeTab grant errors.
- [x] Added toolbar collapse/restore by clicking the Capca logo in the in-page
  recording controls.
- [x] Fixed malformed Chrome tab-capture constraints that blocked current-tab
  recording from starting.
- [x] Defaulted meeting-style captures toward current-tab recording so Google
  Meet participant audio is captured through Chrome tab audio.
- [x] Routed captured tab audio back to local playback while recording.
- [x] Fixed the extension startup bug where every tab mounted the camera bubble
  and showed Chrome's recording indicator before the user started recording.
- [x] Added the missing extension `popup.html` target referenced by
  `manifest.json`.
- [x] Reviewed the local repo shape and existing Cap architecture notes.
- [x] Compared the current product direction against Cap, Loom, and Bluedot.
- [x] Captured the recommended product positioning and roadmap in
  `docs/PRODUCT_STRATEGY.md`.
