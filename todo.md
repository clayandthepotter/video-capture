# Todo

Updated: 2026-07-09

## In Progress

- [ ] Stabilize the Chrome extension refactor so manifest, popup/control UI,
  content script, background status machine, and offscreen recorder agree.
- [ ] Verify the current web record/upload/share/delete loop against local
  Postgres + MinIO.
- [ ] Decide the first competitive wedge: web/extension-first self-hostable
  async video, not desktop Studio Mode parity.

## Next

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
