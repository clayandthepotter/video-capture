# Capca

Open source video messaging: record your screen, camera, and microphone, then
share the recording with a link.

Capca is a web-first, self-hostable alternative to Loom, inspired by
[Cap](https://github.com/CapSoftware/Cap). The product direction is simple:
make async video fast enough for daily team communication while keeping storage,
deployment, and data ownership in the user's hands.

## What Works Today

- **Web recorder**: record a screen/window/tab with a draggable camera bubble,
  microphone, and optional display audio.
- **Share links**: authenticated users can upload a recording and share it at
  `/s/<id>`.
- **Dashboard**: list recordings, copy links, and delete recordings.
- **Bring-your-own storage**: recordings upload directly to S3-compatible
  storage such as MinIO, Cloudflare R2, or AWS S3.
- **Chrome extension**: record from any normal web page with an in-page camera
  bubble and toolbar.

## Product Status

This is an early product, not a toy prototype. The core loop exists, but the
quality bar is still being raised toward a reliable open-source release.

Good paths to try now:

- Browser recording from `http://localhost:3000/record`
- Authenticated upload and public share links
- Chrome extension tab/window/screen recording through Chrome's native picker
- Google Meet recording by choosing the Meet tab and enabling tab audio

Known gaps:

- Upload-while-recording and crash recovery are not finished.
- Share pages do not yet have comments, transcripts, analytics, or privacy
  controls.
- Extension upload targets are currently hardcoded in
  `apps/extension/background.js`.
- There is no production Docker image yet; local Docker only runs Postgres and
  MinIO.

See [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md) for the product
roadmap and [ARCHITECTURE.md](ARCHITECTURE.md) for the technical architecture.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 11+ via Corepack
- Docker Desktop or another Docker runtime
- Chrome or Chromium for extension testing

Enable pnpm:

```sh
corepack enable
```

### 1. Install Dependencies

```sh
pnpm install
```

### 2. Create Environment File

On macOS/Linux:

```sh
cp apps/web/.env.example apps/web/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
```

Then edit `apps/web/.env` and set a real `BETTER_AUTH_SECRET`.

Generate one with OpenSSL if available:

```sh
openssl rand -base64 32
```

For local development, the S3 and Postgres defaults in `.env.example` match
`docker-compose.yml`.

### 3. Start Local Infrastructure

```sh
docker compose up -d
```

This starts:

- Postgres at `localhost:5433`
- MinIO S3 API at `localhost:9000`
- MinIO console at `http://localhost:9001`

MinIO local credentials:

- Username: `capca`
- Password: `capca`

If you previously ran the project before the repo was renamed to Capca, remove
old local volumes before restarting Docker:

```sh
docker compose down -v
docker compose up -d
```

### 4. Create Database Tables

```sh
pnpm --filter @capca/web db:push
```

### 5. Start The Web App

```sh
pnpm dev
```

Open `http://localhost:3000`.

## Try The Web Recorder

1. Go to `http://localhost:3000/record`.
2. Allow camera and microphone permissions.
3. Pick a tab, window, or screen in Chrome's native picker.
4. Record a short video.
5. Stop recording and preview the result.
6. Sign up or sign in.
7. Click **Upload & get share link**.
8. Open the generated `/s/<id>` share page.

If upload fails, check that Docker is running and that `apps/web/.env` matches
the MinIO settings from `.env.example`.

## Try The Chrome Extension

The extension has no build step.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `apps/extension`.
5. Pin the Capca extension.
6. Open any normal web page. Chrome pages such as `chrome://extensions` cannot
   be captured.
7. Click the Capca extension and start recording.
8. Choose what to share in Chrome's native picker.

For Google Meet:

1. Open the Meet tab.
2. Start Capca recording.
3. In Chrome's picker, choose the Meet tab.
4. Keep **Also share tab audio** enabled.

The extension's in-page toolbar can be collapsed by clicking the Capca logo.
Click the compact logo to restore it.

## Useful Commands

```sh
pnpm dev
pnpm --filter @capca/web build
pnpm --filter @capca/web db:push
```

`pnpm lint` exists at the root, but the workspace does not currently define
package-level lint scripts. Add lint coverage before relying on it as a release
gate.

## Troubleshooting

### `BETTER_AUTH_SECRET` is missing

Set `BETTER_AUTH_SECRET` in `apps/web/.env`, then restart `pnpm dev`.

### Upload fails after recording

Check:

- `docker compose up -d` is running
- `S3_ENDPOINT=http://localhost:9000`
- `S3_ACCESS_KEY_ID=capca`
- `S3_SECRET_ACCESS_KEY=capca`
- `S3_FORCE_PATH_STYLE=true`

The app creates the local MinIO bucket on first use when
`S3_AUTO_CREATE_BUCKET=true`.

### Extension says a Chrome page cannot be captured

Chrome does not allow extensions to capture or inject controls into pages such
as `chrome://extensions`, the Chrome Web Store, or some browser-owned pages.
Open a normal `http` or `https` page and try again.

### Google Meet recording has no participant audio

Use Chrome's native picker to select the Meet tab, not an unrelated window, and
make sure **Also share tab audio** is enabled.

### Extension changes do not show up

Go to `chrome://extensions` and click reload on the unpacked Capca extension.
Then refresh the page you are recording.

## Repo Layout

```text
apps/
  web/         Next.js app: landing, auth, recorder, dashboard, share pages, API
  extension/   Chrome MV3 extension: popup, in-page controls, offscreen recorder
docs/          Product and architecture notes
tools/         Local automation and extension test scripts
```

## Contributing

The most valuable contributions right now are reliability improvements:

- Extension smoke tests
- Upload-while-recording
- Local chunk recovery after crashes
- Share-page comments, transcripts, and privacy controls
- Clear setup and deployment documentation

Before opening a pull request, run:

```sh
pnpm --filter @capca/web build
```

Also test the extension manually through `chrome://extensions` if your change
touches `apps/extension`.

## License

AGPL-3.0-only
