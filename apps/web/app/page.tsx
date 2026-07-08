import Link from "next/link";

const GITHUB_URL = "https://github.com/clayandthepotter/video-capture";

const FEATURES = [
  {
    title: "Camera bubble",
    body: "A draggable presenter bubble, baked into every recording — plus a floating always-on-top self-view while you present.",
    icon: "🎥",
  },
  {
    title: "Share with a link",
    body: "Stop recording, get a link. Send it in Slack, email, or a PR — viewers just press play. No downloads, no accounts needed to watch.",
    icon: "🔗",
  },
  {
    title: "No install required",
    body: "Record screen, window, or tab straight from the browser. A Chrome extension adds one-click recording on any page.",
    icon: "⚡",
  },
  {
    title: "Own your storage",
    body: "Recordings go to your S3-compatible bucket — Cloudflare R2, AWS S3, MinIO. Your videos never have to live on someone else's cloud.",
    icon: "🪣",
  },
  {
    title: "Open source",
    body: "AGPL-3.0, built in the open. Audit it, extend it, or run the whole stack yourself with one docker compose up.",
    icon: "🌱",
  },
  {
    title: "Private by default",
    body: "Unlisted share links, no trackers, no telemetry. Delete a recording and it's actually gone.",
    icon: "🔒",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Hit record",
    body: "Pick a screen, window, or tab. Turn on your camera and mic.",
  },
  {
    n: "2",
    title: "Present",
    body: "Your camera bubble floats over what you're showing. Drag it anywhere — the recording follows.",
  },
  {
    n: "3",
    title: "Share the link",
    body: "The moment you stop, upload and copy a share link. Anyone can watch instantly.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          video<span className="text-emerald-400">-capture</span>
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-4">
          <a
            href={GITHUB_URL}
            className="hidden px-3 py-2 text-zinc-400 transition hover:text-zinc-100 sm:block"
          >
            GitHub
          </a>
          <Link
            href="/login"
            className="px-3 py-2 text-zinc-400 transition hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/record"
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Record now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pb-20 pt-16 text-center">
        <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-400">
          Open source · Self-hostable · AGPL-3.0
        </span>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Show it once.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Never explain twice.
          </span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-400">
          Record your screen with your face and voice on it, then share a link
          instead of scheduling a meeting. The open source alternative to Loom
          — right in your browser.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/record"
            className="rounded-lg bg-emerald-500 px-8 py-3.5 text-lg font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Start recording — it&apos;s free
          </Link>
          <a
            href={GITHUB_URL}
            className="rounded-lg border border-zinc-700 px-8 py-3.5 text-lg font-semibold text-zinc-300 transition hover:border-zinc-500"
          >
            Star on GitHub
          </a>
        </div>

        {/* Mock recorder window */}
        <div className="mt-8 w-full max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-emerald-500/5">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-4 flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                REC 02:14
              </span>
            </div>
            <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/40 p-8">
              <div className="flex flex-col gap-3">
                <div className="h-4 w-2/3 rounded bg-zinc-800" />
                <div className="h-4 w-1/2 rounded bg-zinc-800/70" />
                <div className="h-4 w-3/5 rounded bg-zinc-800/50" />
                <div className="mt-4 h-24 w-full rounded-lg border border-zinc-800 bg-zinc-900/50" />
              </div>
              <div className="absolute bottom-6 left-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-emerald-400/30 to-teal-600/30 shadow-xl sm:h-28 sm:w-28">
                <span className="text-4xl">🙂</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Everything you need to talk with video
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-zinc-400">
            The core of Loom, rebuilt in the open — without the lock-in.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-zinc-700"
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Three steps, thirty seconds
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-lg font-bold text-emerald-400">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Your next status update is a link
          </h2>
          <p className="max-w-md text-zinc-400">
            No credit card, no sales call, no install. Record something right
            now and see for yourself.
          </p>
          <Link
            href="/record"
            className="rounded-lg bg-emerald-500 px-8 py-3.5 text-lg font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Start recording
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
          <span>
            video-capture — open source video messaging · AGPL-3.0
          </span>
          <div className="flex gap-6">
            <a href={GITHUB_URL} className="transition hover:text-zinc-300">
              GitHub
            </a>
            <Link href="/record" className="transition hover:text-zinc-300">
              Record
            </Link>
            <Link href="/dashboard" className="transition hover:text-zinc-300">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
