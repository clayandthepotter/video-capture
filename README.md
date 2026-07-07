# video-capture

Open source video messaging — record your screen and camera, share with a link.
A web-first, self-hostable alternative to Loom.

> Working title. Inspired by [Cap](https://github.com/CapSoftware/Cap)'s
> architecture, rebuilt web-first. See [ARCHITECTURE.md](ARCHITECTURE.md).

## What works today

- **Web recorder** (`apps/web`): record screen + draggable camera bubble + mic
  in the browser, preview the result, download as WebM.
- **Share links**: sign up, upload a recording, and share it at `/s/<id>` —
  Loom's core loop. Recordings live in your own S3-compatible bucket.
- **Dashboard**: list, copy links, delete.
- **Chrome extension** (`apps/extension`): record any page with a Loom-style
  camera bubble injected into it; saves a WebM on stop.

## Getting started

Prereqs: Node 20+, pnpm (`corepack enable`), Docker.

```sh
pnpm install
cp apps/web/.env.example apps/web/.env   # then set BETTER_AUTH_SECRET
docker compose up -d                     # Postgres (:5433) + MinIO (:9000)
pnpm --filter @video-capture/web db:push # create tables
pnpm dev                                 # web app at http://localhost:3000
```

Open http://localhost:3000/record, allow camera/mic, pick a screen, record,
then sign up and hit "Upload & get share link".

### Chrome extension

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension`.
3. Pin the extension, click it on any page, hit record.

## Repo layout

```
apps/web/         Next.js — landing, recorder, (later) dashboard + share pages
apps/extension/   Chrome MV3 extension
packages/         (future) shared db/ui/sdk packages
```

## License

AGPL-3.0
